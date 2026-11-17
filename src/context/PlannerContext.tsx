import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { Subject, Task, TaskStatus, ViewTab } from '../types';
import { INITIAL_SUBJECTS, INITIAL_TASKS } from '../data/initialData';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import { isInnovationLabSubject } from '../utils/helpers';
import confetti from 'canvas-confetti';
import { isCorruptedCodeTask, type ClassroomSyncResult } from '../services/classroomSync';
import {
  autoResolveCourse,
  ignoredKeysForSubject,
  normalizeText,
  planClassroomTaskWrites,
  type ExistingTaskRow,
  type IncomingClassroomTask,
} from '../services/classroomImport';
import {
  addIgnoredCourses,
  loadIgnoredCourses,
  removeIgnoredCourses,
  type IgnoredCourse,
} from '../services/ignoredCourses';

export interface SubjectEditInput {
  code: string;
  name: string;
  professor: string;
  schedule: string;
  description: string;
  topics: string[];
}

export interface SubjectDeleteSummary {
  deletedTasks: number;
  /** The subject had Classroom activities: its class is now ignored by the next syncs. */
  ignoredInClassroom: boolean;
  /** 'local' = remembered only in this browser (migration not applied yet). */
  ignoredStorage?: 'db' | 'local';
}

/** What to do with one Classroom class when importing (chosen in the "Turmas novas" review). */
export type CourseResolution =
  | { action: 'create' }
  | { action: 'link'; subjectId: string }
  | { action: 'ignore' };

export interface ClassroomApplySummary {
  inserted: number;
  updated: number;
  subjectsCreated: number;
  ignoredCourses: number;
  skippedTasks: number;
}

export interface ClassroomSyncMetadata {
  timestamp: string;
  coursesCount: number;
  tasksCount: number;
  materialsCount: number;
  evaluationsCount: number;
  announcementsCount: number;
  source: string;
}

export interface NewSubjectInput {
  code: string;
  name: string;
  professor: string;
}

interface PlannerContextType {
  subjects: Subject[];
  tasks: Task[];
  activeTab: ViewTab;
  setActiveTab: (tab: ViewTab) => void;
  selectedSubject: Subject | null;
  setSelectedSubject: (subject: Subject | null) => void;
  studentName: string;
  setStudentName: (name: string) => void;
  addSubject: (subjectData: NewSubjectInput) => Subject;
  /** Saves name/code/professor/schedule in Supabase. Resolves with a warning when only part could be saved. */
  updateSubject: (subjectId: string, input: SubjectEditInput) => Promise<{ warning?: string }>;
  /** Deletes the subject and its tasks (same user_id only). */
  deleteSubject: (subjectId: string) => Promise<SubjectDeleteSummary>;
  /** Classroom classes the student ignored (not recreated by the next sync). */
  ignoredCourses: IgnoredCourse[];
  /** "Voltar a importar": forget the ignore for every key saved under this class name. */
  restoreIgnoredCourse: (courseName: string) => Promise<void>;
  addTask: (task: Omit<Task, 'id'>) => void;
  applyClassroomSyncResult: (
    result: ClassroomSyncResult,
    resolutions?: Record<string, CourseResolution>
  ) => Promise<ClassroomApplySummary>;
  isClassroomModalOpen: boolean;
  setIsClassroomModalOpen: (open: boolean) => void;
  lastClassroomSync: ClassroomSyncMetadata | null;
  updateTaskStatus: (id: string, status: TaskStatus) => void;
  deleteTask: (id: string) => void;
  logStudyTime: (subjectId: string, minutes: number) => void;
  isNewTaskModalOpen: boolean;
  setIsNewTaskModalOpen: (open: boolean) => void;
  isLoadingData: boolean;
  /** True once subjects/tasks for the current user were loaded from Supabase (success or error). */
  isPlannerReady: boolean;
  loadError: string | null;
  loadExampleData: () => Promise<void>;
  resetToDefault: () => void;
}

const PlannerContext = createContext<PlannerContextType | undefined>(undefined);

const STORAGE_KEYS = {
  // v7: the v6 cache still holds sample content (schedule, materials, evaluations) copied from INITIAL_SUBJECTS.
  SUBJECTS: 'edutrack_subjects_v7',
  SUBJECTS_STALE: 'edutrack_subjects_v6',
  SUBJECTS_LEGACY: 'edutrack_subjects_v5',
  TASKS: 'edutrack_tasks_v6',
  STUDENT_NAME: 'edutrack_student_name_v1',
  SYNC_META: 'edutrack_classroom_sync_meta',
};

function getScopedKey(base: string, userId?: string | null): string | null {
  return userId ? `${base}_${userId}` : null;
}

function normalizeSubject(raw: any): Subject {
  const matchedInitial = INITIAL_SUBJECTS.find(
    (s) =>
      s.id === raw.id ||
      s.code.toLowerCase() === String(raw.code || raw.codigo || '').toLowerCase() ||
      s.name.toLowerCase() === String(raw.name || raw.nome || '').toLowerCase()
  );

  const professors: string[] =
    Array.isArray(raw.professors) && raw.professors.length > 0
      ? raw.professors.map(String)
      : raw.professor
      ? [String(raw.professor)]
      : ['Prof. Responsável'];

  // Only real data: the public.subjects row (or what the student typed) plus Classroom content merged later.
  // The sample catalog (INITIAL_SUBJECTS) is used just for the stable id (MVP rules rely on 'innovation-lab')
  // and the card colors; never for schedule, description, topics, materials or evaluations.
  return {
    id: matchedInitial ? matchedInitial.id : String(raw.id || 'subj-' + Date.now()),
    code: String(raw.code || raw.codigo || 'IMP-000'),
    name: String(raw.name || raw.nome || 'Disciplina'),
    professors,
    progress: typeof raw.progress === 'number' ? raw.progress : 0,
    totalHours:
      typeof raw.totalHours === 'number'
        ? raw.totalHours
        : typeof raw.carga_horaria_total === 'number'
        ? raw.carga_horaria_total
        : 80,
    completedHours: typeof raw.completedHours === 'number' ? raw.completedHours : 0,
    studyTimeHours: typeof raw.studyTimeHours === 'number' ? raw.studyTimeHours : 0,
    color: raw.color || matchedInitial?.color || '#3b82f6',
    accentColor: raw.accentColor || matchedInitial?.accentColor || 'from-sky-500 to-blue-600',
    // public.subjects.horario (edited by the student); empty when not set.
    nextClass: raw.horario || raw.nextClass || '',
    schedule: raw.horario || raw.schedule || '',
    room: raw.room || '',
    // public.subjects.descricao / topicos (typed by the student); Classroom topics fill in when empty.
    description: raw.descricao || raw.description || '',
    topics:
      Array.isArray(raw.topicos) && raw.topicos.length > 0
        ? raw.topicos.map(String)
        : Array.isArray(raw.topics)
        ? raw.topics
        : [],
    modules: Array.isArray(raw.modules) ? raw.modules : [],
    materials: Array.isArray(raw.materials) ? raw.materials : [],
    evaluations: Array.isArray(raw.evaluations) ? raw.evaluations : [],
  };
}

/**
 * Materials, evaluations and topics read from Classroom, per public.subjects id. There is no column for them in
 * Supabase, so they are kept in this browser and re-applied whenever subjects are reloaded from the database.
 */
type ClassroomSubjectData = Pick<Subject, 'materials' | 'evaluations' | 'topics' | 'modules'>;
const CLASSROOM_DATA_KEY = 'edutrack_classroom_subject_data_v1';

function loadClassroomSubjectData(userId?: string | null): Record<string, ClassroomSubjectData> {
  const key = getScopedKey(CLASSROOM_DATA_KEY, userId);
  if (!key) return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveClassroomSubjectData(userId: string | null | undefined, data: Record<string, ClassroomSubjectData>) {
  const key = getScopedKey(CLASSROOM_DATA_KEY, userId);
  if (!key) return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving Classroom subject data to localStorage', e);
  }
}

function loadSubjectsFromStorage(userId?: string | null): Subject[] {
  const key = getScopedKey(STORAGE_KEYS.SUBJECTS, userId);
  if (!key) return [];
  try {
    const saved = localStorage.getItem(key);
    const candidate = saved ? JSON.parse(saved) : null;

    if (Array.isArray(candidate) && candidate.length > 0) {
      return candidate.map(normalizeSubject);
    }
  } catch (e) {
    console.error('Error loading subjects from localStorage', e);
  }
  return [];
}

function persistSubjectsToStorage(subjectsList: Subject[], userId?: string | null) {
  const key = getScopedKey(STORAGE_KEYS.SUBJECTS, userId);
  if (!key) return;
  try {
    localStorage.setItem(key, JSON.stringify(subjectsList));
  } catch (e) {
    console.error('Error saving subjects to localStorage', e);
  }
}

function loadTasksFromStorage(userId?: string | null): Task[] {
  const key = getScopedKey(STORAGE_KEYS.TASKS, userId);
  if (!key) return [];
  const saved = localStorage.getItem(key);
  if (saved) {
    try {
      const parsed = JSON.parse(saved) as Task[];
      if (Array.isArray(parsed)) {
        const sanitized = parsed.filter((t) => !isCorruptedCodeTask(t));
        if (sanitized.length !== parsed.length) {
          localStorage.setItem(key, JSON.stringify(sanitized));
        }
        return sanitized;
      }
    } catch (e) {
      console.error('Error loading tasks from localStorage', e);
    }
  }
  return [];
}

function loadSyncMetaFromStorage(userId?: string | null): ClassroomSyncMetadata | null {
  const key = getScopedKey(STORAGE_KEYS.SYNC_META, userId);
  if (!key) return null;
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

function dedupeDbSubjects(dbSubjects: any[]): Subject[] {
  const unique: Subject[] = [];
  for (const dbSub of dbSubjects.map(normalizeSubject)) {
    const alreadyAdded = unique.some(
      (s) => s.name.toLowerCase() === dbSub.name.toLowerCase() || s.code.toLowerCase() === dbSub.code.toLowerCase()
    );
    if (!alreadyAdded) unique.push(dbSub);
  }
  return unique;
}

function mapDbTasks(dbTasks: any[], dbSubjects: any[], localSubjects: Subject[]): Task[] {
  return dbTasks
    .map((row: any): Task => {
      const dbSub = dbSubjects.find((s: any) => s.id === row.subject_id);
      const matchedLocalSub =
        localSubjects.find(
          (s) =>
            s.id === row.subject_id ||
            (dbSub &&
              (s.name.toLowerCase() === String(dbSub.nome || '').toLowerCase() ||
                s.code.toLowerCase() === String(dbSub.codigo || '').toLowerCase()))
        ) || localSubjects[0];

      const dateStr = row.data_entrega
        ? String(row.data_entrega).split('T')[0]
        : new Date().toISOString().split('T')[0];

      return {
        id: String(row.id),
        title: String(row.titulo || 'Tarefa'),
        subjectId: matchedLocalSub ? matchedLocalSub.id : String(row.subject_id || ''),
        subjectName: matchedLocalSub ? matchedLocalSub.name : String(dbSub?.nome || 'Disciplina'),
        dueDate: dateStr,
        dueTime: '23:59',
        priority: (row.prioridade as Task['priority']) || 'media',
        status: (row.status as TaskStatus) || 'todo',
        type: 'exercicio',
        isCriticalMvp: false,
        description: row.descricao || '',
        importedFromClassroom: Boolean(row.importado_classroom),
        classroomId: row.classroom_id || undefined,
      };
    })
    .filter((t) => !isCorruptedCodeTask(t));
}

/** Turns a Supabase error on public.tasks into an actionable message (most likely: migration not applied yet). */
function explainTasksError(message: string): string {
  if (/classroom_id/i.test(message) || /no unique or exclusion constraint/i.test(message)) {
    return 'O banco ainda não tem a coluna tasks.classroom_id. Rode a migration supabase/migrations/20261116000000_add_classroom_id_to_tasks.sql no SQL Editor do Supabase e tente de novo.';
  }
  return `Erro ao salvar as atividades no Supabase: ${message}`;
}

/** Stable list order: by code, then name. */
function compareSubjects(a: Pick<Subject, 'code' | 'name'>, b: Pick<Subject, 'code' | 'name'>): number {
  return (
    a.code.localeCompare(b.code, 'pt-BR', { numeric: true, sensitivity: 'base' }) ||
    a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
  );
}

/** Adds Classroom materials/evaluations/topics to a subject without dropping what it already had. */
function mergeClassroomSubjectData<T extends ClassroomSubjectData>(target: T, fromClassroom: ClassroomSubjectData): T {
  const mergeById = <I extends { id: string }>(a: I[] = [], b: I[] = []) => [
    ...a,
    ...b.filter((item) => !a.some((x) => x.id === item.id)),
  ];
  return {
    ...target,
    materials: mergeById(target.materials, fromClassroom.materials),
    evaluations: mergeById(target.evaluations, fromClassroom.evaluations),
    topics: target.topics?.length ? target.topics : fromClassroom.topics || [],
    modules: target.modules?.length ? target.modules : fromClassroom.modules || [],
  };
}

export const PlannerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const userId = currentUser?.id || null;
  const fetchInFlightRef = useRef<string | null>(null);
  const addSubjectInFlightRef = useRef<boolean>(false);
  const addTaskInFlightRef = useRef<boolean>(false);
  const syncInFlightRef = useRef<boolean>(false);

  const activeTab: ViewTab = useMemo(() => {
    const raw = location.pathname.replace(/^\//, '');
    const validTabs: ViewTab[] = ['dashboard', 'disciplinas', 'tarefas', 'timer', 'ai-assistant'];
    if (validTabs.includes(raw as ViewTab)) {
      return raw as ViewTab;
    }
    return 'dashboard';
  }, [location.pathname]);

  const setActiveTab = (tab: ViewTab) => {
    navigate(`/${tab}`);
  };

  const [subjects, setSubjects] = useState<Subject[]>(() => loadSubjectsFromStorage(userId));
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(() => subjects[0] || null);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState<boolean>(false);
  const [isClassroomModalOpen, setIsClassroomModalOpen] = useState<boolean>(false);
  const [lastClassroomSync, setLastClassroomSync] = useState<ClassroomSyncMetadata | null>(() =>
    loadSyncMetaFromStorage(userId)
  );
  const [studentNameState, setStudentNameState] = useState<string>(() => {
    const key = getScopedKey(STORAGE_KEYS.STUDENT_NAME, userId);
    return (key && localStorage.getItem(key)) || 'Estudante';
  });

  const studentName = currentUser?.name || studentNameState;

  const [tasks, setTasks] = useState<Task[]>(() => loadTasksFromStorage(userId));
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);
  const [isPlannerReady, setIsPlannerReady] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [ignoredCourses, setIgnoredCourses] = useState<IgnoredCourse[]>([]);

  /** Replaces subjects/tasks in state (and the local cache) with rows read from Supabase. */
  const applyDbSnapshot = (dbSubjects: any[], dbTasks: any[]) => {
    // Classroom content saved for each public.subjects row (by id), re-applied by subject name after dedupe.
    const stored = loadClassroomSubjectData(userId);
    const classroomByName = new Map<string, ClassroomSubjectData>();
    for (const row of dbSubjects) {
      const data = stored[String(row.id)];
      if (!data) continue;
      const key = normalizeText(row.nome);
      const prev = classroomByName.get(key);
      classroomByName.set(key, prev ? mergeClassroomSubjectData(prev, data) : data);
    }
    const uniqueDbSubjects = dedupeDbSubjects(dbSubjects)
      .map((s) => {
        const extra = classroomByName.get(normalizeText(s.name));
        return extra ? mergeClassroomSubjectData(s, extra) : s;
      })
      .sort(compareSubjects);
    setSubjects(uniqueDbSubjects);
    // Use the fresh object (the previous one may lack the content just synced).
    setSelectedSubject((prev) => uniqueDbSubjects.find((s) => s.id === prev?.id) || uniqueDbSubjects[0] || null);
    persistSubjectsToStorage(uniqueDbSubjects, userId);

    const cleanDbTasks = mapDbTasks(dbTasks, dbSubjects, uniqueDbSubjects);
    setTasks(cleanDbTasks);
    const tasksKey = getScopedKey(STORAGE_KEYS.TASKS, userId);
    if (tasksKey) localStorage.setItem(tasksKey, JSON.stringify(cleanDbTasks));
  };

  const fetchDbRows = async (uid: string) => {
    const { data: dbSubjects, error: subjectsError } = await supabase.from('subjects').select('*').eq('user_id', uid);
    if (subjectsError) throw new Error(`Erro ao carregar disciplinas: ${subjectsError.message}`);
    const { data: dbTasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false });
    if (tasksError) throw new Error(`Erro ao carregar tarefas: ${tasksError.message}`);
    return { dbSubjects: dbSubjects || [], dbTasks: dbTasks || [] };
  };

  // Limpa e recarrega o estado em memória quando o usuário faz logout ou troca de conta
  useEffect(() => {
    // Drop the old subjects cache that mixed sample content into real subjects.
    const staleKey = getScopedKey(STORAGE_KEYS.SUBJECTS_STALE, userId);
    if (staleKey) {
      try {
        localStorage.removeItem(staleKey);
      } catch {
        // storage unavailable
      }
    }
    const scopedSubs = loadSubjectsFromStorage(userId);
    const scopedTasks = loadTasksFromStorage(userId);
    const scopedSync = loadSyncMetaFromStorage(userId);
    const nameKey = getScopedKey(STORAGE_KEYS.STUDENT_NAME, userId);
    setSubjects(scopedSubs);
    setSelectedSubject(scopedSubs[0] || null);
    setTasks(scopedTasks);
    setLastClassroomSync(scopedSync);
    setIgnoredCourses([]);
    setLoadError(null);
    setStudentNameState((nameKey && localStorage.getItem(nameKey)) || currentUser?.name || 'Estudante');
  }, [userId]);

  // Sincronização inicial com o Supabase (SELECT nas tabelas subjects e tasks — sem auto-seed ou fallback mock)
  useEffect(() => {
    setIsPlannerReady(false);
    if (!userId) return;
    if (fetchInFlightRef.current === userId) return;
    fetchInFlightRef.current = userId;

    const fetchFromSupabase = async () => {
      setIsLoadingData(true);
      setLoadError(null);
      try {
        // 1. Buscar disciplinas no Supabase
        const { data: dbSubjects, error: subjectsError } = await supabase
          .from('subjects')
          .select('*')
          .eq('user_id', userId);

        if (subjectsError) {
          setLoadError(`Erro ao carregar disciplinas: ${subjectsError.message}`);
          return;
        }

        // 2. Buscar tarefas no Supabase
        const { data: dbTasks, error: tasksError } = await supabase
          .from('tasks')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (tasksError) {
          setLoadError(`Erro ao carregar tarefas: ${tasksError.message}`);
          return;
        }

        // 3. Garante perfil e atualiza estado com os dados reais do banco (vazio se não houver registros)
        const { data: authData } = await supabase.auth.getUser();
        const authUserId = authData?.user?.id;

        if (authUserId && authUserId === userId) {
          await supabase.from('profiles').upsert(
            {
              id: authUserId,
              nome: studentName,
              curso: currentUser?.course || 'Graduação',
              semestre_atual: currentUser?.semester || '2026.2',
            },
            { onConflict: 'id' }
          );
        }

        applyDbSnapshot(dbSubjects || [], dbTasks || []);
        // Loaded before isPlannerReady, so an import right after the Google redirect already skips them.
        setIgnoredCourses(await loadIgnoredCourses(userId));
      } catch (err: any) {
        setLoadError(err?.message || 'Erro ao conectar com o Supabase.');
      } finally {
        setIsLoadingData(false);
        setIsPlannerReady(true);
        if (fetchInFlightRef.current === userId) {
          fetchInFlightRef.current = null;
        }
      }
    };

    void fetchFromSupabase();
  }, [userId]);

  // Função auxiliar para garantir vínculo de usuário e disciplina (UUID) no Supabase
  const resolveSupabaseIds = async (localSubjectId: string, localSubjectName?: string) => {
    const { data: authData } = await supabase.auth.getUser();
    const uid = authData?.user?.id;
    if (!uid) return null;

    // Garante que o perfil existe na tabela profiles
    await supabase.from('profiles').upsert(
      {
        id: uid,
        nome: studentName,
        curso: 'Ciência da Computação',
        semestre_atual: '2026.2',
      },
      { onConflict: 'id' }
    );

    const localSub =
      subjects.find((s) => s.id === localSubjectId || s.name === localSubjectName) || subjects[0];

    // Procura a disciplina correspondente no Supabase usando limit(1) para evitar falha de maybeSingle em duplicatas
    const { data: existingSubs } = await supabase
      .from('subjects')
      .select('id, nome, codigo')
      .eq('user_id', uid);

    const matched = (existingSubs || []).find(
      (s: any) =>
        String(s.nome || '').toLowerCase() === localSub.name.toLowerCase() ||
        String(s.codigo || '').toLowerCase() === (localSub.code || '').toLowerCase()
    );

    if (matched?.id) {
      return { userId: uid, subjectUuid: matched.id };
    }

    // Se ainda não existir no banco, insere a disciplina e retorna o UUID gerado
    const { data: createdSub } = await supabase
      .from('subjects')
      .insert({
        user_id: uid,
        codigo: localSub.code || 'IMP-01',
        nome: localSub.name,
        professor: localSub.professors?.[0] || 'Prof. Responsável',
        carga_horaria_total: localSub.totalHours || 80,
      })
      .select('id')
      .limit(1);

    const createdId = Array.isArray(createdSub) ? createdSub[0]?.id : (createdSub as any)?.id;
    return createdId ? { userId: uid, subjectUuid: createdId } : null;
  };

  useEffect(() => {
    persistSubjectsToStorage(subjects, userId);
  }, [subjects, userId]);

  useEffect(() => {
    const tasksKey = getScopedKey(STORAGE_KEYS.TASKS, userId);
    if (tasksKey) localStorage.setItem(tasksKey, JSON.stringify(tasks));
  }, [tasks, userId]);

  const setStudentName = (name: string) => {
    setStudentNameState(name);
    const nameKey = getScopedKey(STORAGE_KEYS.STUDENT_NAME, userId);
    if (nameKey) localStorage.setItem(nameKey, name);
  };

  const addSubject = (subjectData: NewSubjectInput): Subject => {
    const newSub = normalizeSubject({
      id: `subj-${Date.now()}`,
      code: subjectData.code.trim(),
      name: subjectData.name.trim(),
      professors: [subjectData.professor.trim() || 'Prof. Responsável'],
      progress: 0,
      totalHours: 80,
      completedHours: 0,
      studyTimeHours: 0,
      color: '#3b82f6',
      accentColor: 'from-sky-500 to-blue-600',
    });

    if (addSubjectInFlightRef.current) {
      return newSub;
    }
    addSubjectInFlightRef.current = true;

    setSubjects((prev) => {
      const updated = [...prev, newSub];
      persistSubjectsToStorage(updated, userId);
      return updated;
    });
    setSelectedSubject(newSub);

    // Sincroniza nova disciplina com o Supabase em segundo plano sem duplicar
    (async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const uid = authData?.user?.id;
        if (uid) {
          const { data: existingSubs } = await supabase
            .from('subjects')
            .select('id, nome, codigo')
            .eq('user_id', uid);

          const alreadyExists = (existingSubs || []).some(
            (s: any) =>
              String(s.nome || '').toLowerCase() === newSub.name.toLowerCase() ||
              String(s.codigo || '').toLowerCase() === newSub.code.toLowerCase()
          );

          if (!alreadyExists) {
            await supabase.from('subjects').insert({
              user_id: uid,
              codigo: newSub.code,
              nome: newSub.name,
              professor: newSub.professors[0],
              carga_horaria_total: newSub.totalHours,
            });
          }
        }
      } catch (e) {
        console.warn('Erro ao salvar disciplina no Supabase:', e);
      } finally {
        addSubjectInFlightRef.current = false;
      }
    })();

    return newSub;
  };

  const addTask = (newTaskData: Omit<Task, 'id'>) => {
    if (addTaskInFlightRef.current) return;
    addTaskInFlightRef.current = true;

    // Guard: MVP is exclusive to Innovation Lab (IMP-INN303), regardless of what the UI sent.
    const targetSubject = subjects.find((s) => s.id === newTaskData.subjectId);
    const mvpAllowed = isInnovationLabSubject(
      targetSubject ?? { id: newTaskData.subjectId, code: '', name: newTaskData.subjectName }
    );
    if (!mvpAllowed) {
      newTaskData = {
        ...newTaskData,
        isCriticalMvp: false,
        scoreWeight: undefined,
        type: newTaskData.type === 'avaliacao_mvp' ? 'avaliacao' : newTaskData.type,
      };
    }

    const tempId = 'task-' + Date.now();
    const newTask: Task = {
      ...newTaskData,
      id: tempId,
      status: 'todo',
      importedFromClassroom: false,
    };

    setTasks((prev) => {
      const updated = [newTask, ...prev];
      const tasksKey = getScopedKey(STORAGE_KEYS.TASKS, userId);
      if (tasksKey) localStorage.setItem(tasksKey, JSON.stringify(updated));
      return updated;
    });

    // Faz o INSERT na tabela tasks do Supabase
    (async () => {
      try {
        const ids = await resolveSupabaseIds(newTaskData.subjectId, newTaskData.subjectName);
        if (!ids) return;

        const { data, error } = await supabase
          .from('tasks')
          .insert({
            subject_id: ids.subjectUuid,
            user_id: ids.userId,
            titulo: newTaskData.title,
            descricao: newTaskData.description || '',
            data_entrega: newTaskData.dueDate ? new Date(newTaskData.dueDate).toISOString() : null,
            status: 'todo',
            prioridade: newTaskData.priority || 'media',
            importado_classroom: false,
          })
          .select('id')
          .single();

        if (!error && data?.id) {
          setTasks((prev) =>
            prev.map((t) => (t.id === tempId ? { ...t, id: data.id } : t))
          );
        }
      } catch (e) {
        console.warn('Erro ao salvar tarefa no Supabase:', e);
      } finally {
        addTaskInFlightRef.current = false;
      }
    })();
  };

  const applyClassroomSyncResult = async (
    result: ClassroomSyncResult,
    resolutions: Record<string, CourseResolution> = {}
  ): Promise<ClassroomApplySummary> => {
    if (syncInFlightRef.current) {
      throw new Error('Já existe uma sincronização em andamento. Aguarde ela terminar.');
    }
    syncInFlightRef.current = true;
    try {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id;
      if (!uid) throw new Error('Sessão expirada. Entre novamente para importar do Classroom.');

      // 1. Resolve every Classroom class to a subject UUID in public.subjects (link / create / ignore).
      const { data: existingSubs, error: subsError } = await supabase
        .from('subjects')
        .select('id, nome, codigo')
        .eq('user_id', uid);
      if (subsError) throw new Error(`Erro ao ler disciplinas: ${subsError.message}`);
      const knownSubs: { id: string; nome: string; codigo: string }[] = [...(existingSubs || [])];

      const findDbSubject = (name?: string, code?: string) =>
        knownSubs.find(
          (s) =>
            (name && normalizeText(s.nome) === normalizeText(name)) ||
            (code && String(s.codigo || '').toLowerCase() === code.toLowerCase())
        );

      const insertDbSubject = async (draft: Subject) => {
        const { data: inserted, error } = await supabase
          .from('subjects')
          .insert({
            user_id: uid,
            codigo: draft.code,
            nome: draft.name,
            professor: draft.professors.join(', ') || 'Prof. Responsável',
            carga_horaria_total: draft.totalHours || 80,
          })
          .select('id, nome, codigo')
          .single();
        if (error || !inserted) throw new Error(`Erro ao criar a disciplina "${draft.name}": ${error?.message}`);
        knownSubs.push(inserted);
        return inserted;
      };

      const draftToUuid = new Map<string, string | null>();
      // Classroom content per public.subjects id (several classes may be linked to one subject).
      const classroomDataBySubjectId = new Map<string, ClassroomSubjectData>();
      let subjectsCreated = 0;
      let ignoredCount = 0;

      const ignoredKeys = new Set(ignoredCourses.map((c) => c.courseKey));
      for (const draft of result.subjects) {
        const auto = autoResolveCourse(draft, subjects, tasks, ignoredKeys);
        const resolution: CourseResolution =
          resolutions[draft.id] ||
          (auto?.kind === 'link'
            ? { action: 'link', subjectId: auto.subject.id }
            : auto?.kind === 'ignored'
            ? { action: 'ignore' }
            : { action: 'create' });

        if (resolution.action === 'ignore') {
          draftToUuid.set(draft.id, null);
          ignoredCount++;
          continue;
        }

        let dbSub: { id: string; nome: string; codigo: string } | undefined;
        if (resolution.action === 'link') {
          const local = subjects.find((s) => s.id === resolution.subjectId);
          if (!local) throw new Error(`A disciplina escolhida para "${draft.name}" não foi encontrada.`);
          dbSub = knownSubs.find((s) => s.id === local.id) || findDbSubject(local.name, local.code);
          if (!dbSub) dbSub = await insertDbSubject(local);
        } else {
          // "Criar disciplina": reuse a subject with the same name if one already exists in the database.
          dbSub = findDbSubject(draft.name);
          if (!dbSub) {
            dbSub = await insertDbSubject(draft);
            subjectsCreated++;
          }
        }
        draftToUuid.set(draft.id, dbSub.id);
        const fromDraft: ClassroomSubjectData = {
          materials: draft.materials || [],
          evaluations: draft.evaluations || [],
          topics: draft.topics || [],
          modules: draft.modules || [],
        };
        const prevData = classroomDataBySubjectId.get(dbSub.id);
        classroomDataBySubjectId.set(dbSub.id, prevData ? mergeClassroomSubjectData(prevData, fromDraft) : fromDraft);
      }

      // 2. Upsert the activities by their stable Classroom key (no deletes, no duplicates).
      const incoming: IncomingClassroomTask[] = [];
      let skippedTasks = 0;
      for (const task of result.tasks) {
        const subjectUuid = draftToUuid.get(task.subjectId);
        if (!subjectUuid) {
          skippedTasks++;
          continue;
        }
        incoming.push({
          classroomId: task.classroomId,
          title: task.title,
          description: task.description || '',
          dueDate: task.dueDate,
          priority: task.priority,
          turnedIn: task.turnedIn,
          subjectUuid,
        });
      }

      const { data: existingRows, error: rowsError } = await supabase
        .from('tasks')
        .select('id, classroom_id, titulo, subject_id, status, prioridade, importado_classroom, descricao, data_entrega')
        .eq('user_id', uid);
      if (rowsError) throw new Error(explainTasksError(rowsError.message));

      const plan = planClassroomTaskWrites(uid, incoming, (existingRows || []) as ExistingTaskRow[]);
      if (plan.updates.length > 0) {
        const { error } = await supabase.from('tasks').upsert(plan.updates, { onConflict: 'id' });
        if (error) throw new Error(explainTasksError(error.message));
      }
      if (plan.inserts.length > 0) {
        const { error } = await supabase.from('tasks').upsert(plan.inserts, { onConflict: 'user_id,classroom_id' });
        if (error) throw new Error(explainTasksError(error.message));
      }

      // 3. Reload from the database so every card carries its real UUID.
      const { dbSubjects, dbTasks } = await fetchDbRows(uid);
      // This sync's Classroom content replaces what was saved before for the same subjects.
      saveClassroomSubjectData(userId, {
        ...loadClassroomSubjectData(userId),
        ...Object.fromEntries(classroomDataBySubjectId),
      });
      applyDbSnapshot(dbSubjects, dbTasks);

      const meta: ClassroomSyncMetadata = {
        timestamp: new Date().toLocaleString('pt-BR'),
        coursesCount: result.subjects.length - ignoredCount,
        tasksCount: incoming.length,
        materialsCount: result.stats.materialsCount,
        evaluationsCount: result.stats.evaluationsCount,
        announcementsCount: result.stats.announcementsCount,
        source: result.source,
      };
      setLastClassroomSync(meta);
      const syncKey = getScopedKey(STORAGE_KEYS.SYNC_META, userId);
      if (syncKey) localStorage.setItem(syncKey, JSON.stringify(meta));

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.65 },
        colors: ['#34a853', '#4285f4', '#fbbc05', '#8b5cf6'],
      });

      return {
        inserted: plan.inserts.length,
        updated: plan.updates.length,
        subjectsCreated,
        ignoredCourses: ignoredCount,
        skippedTasks,
      };
    } finally {
      syncInFlightRef.current = false;
    }
  };

  /** public.subjects rows behind one subject on screen (same id, or same name: the list hides duplicates). */
  const findDbSubjectRows = async (uid: string, subject: Subject) => {
    const { data, error } = await supabase.from('subjects').select('id, nome, codigo').eq('user_id', uid);
    if (error) throw new Error(`Erro ao ler disciplinas: ${error.message}`);
    return (data || []).filter(
      (row: any) => row.id === subject.id || normalizeText(row.nome) === normalizeText(subject.name)
    ) as { id: string; nome: string; codigo: string }[];
  };

  const updateSubject = async (subjectId: string, input: SubjectEditInput): Promise<{ warning?: string }> => {
    const subject = subjects.find((s) => s.id === subjectId);
    if (!subject) throw new Error('Disciplina não encontrada.');
    const name = input.name.trim();
    const code = input.code.trim();
    if (!name || !code) throw new Error('Preencha o código e o nome da disciplina.');
    const clash = subjects.find(
      (s) =>
        s.id !== subjectId &&
        (normalizeText(s.name) === normalizeText(name) || s.code.trim().toLowerCase() === code.toLowerCase())
    );
    if (clash) throw new Error(`Já existe a disciplina "${clash.name}" com esse nome ou código.`);
    const professors = input.professor
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    if (professors.length === 0) professors.push('Prof. Responsável');
    const schedule = input.schedule.trim();
    const description = input.description.trim();
    const topics = input.topics.map((t) => t.trim()).filter(Boolean);

    let warning: string | undefined;
    if (userId) {
      const ids = (await findDbSubjectRows(userId, subject)).map((r) => r.id);
      if (ids.length > 0) {
        // Columns added by later migrations: if one is missing, save the rest and say what was not stored.
        const optional: Record<string, { value: unknown; label: string; migration: string }> = {
          horario: { value: schedule || null, label: 'horário', migration: '20261117000000_subject_schedule_and_ignored_courses.sql' },
          descricao: { value: description || null, label: 'descrição', migration: '20261118000000_subject_description_and_topics.sql' },
          topicos: { value: topics.length ? topics : null, label: 'tópicos', migration: '20261118000000_subject_description_and_topics.sql' },
        };
        const payload: Record<string, unknown> = { codigo: code, nome: name, professor: professors.join(', ') };
        Object.entries(optional).forEach(([col, o]) => (payload[col] = o.value));
        const skipped: string[] = [];
        let error: { message: string } | null = null;
        for (let attempt = 0; attempt <= Object.keys(optional).length; attempt++) {
          ({ error } = await supabase.from('subjects').update(payload).eq('user_id', userId).in('id', ids));
          const missing = error && Object.keys(optional).find((col) => col in payload && new RegExp(`'${col}'|\\b${col}\\b`).test(error!.message));
          if (!missing) break;
          delete payload[missing];
          skipped.push(missing);
        }
        if (error) throw new Error(`Erro ao salvar a disciplina: ${error.message}`);
        if (skipped.length > 0) {
          const migrations = [...new Set(skipped.map((c) => `supabase/migrations/${optional[c].migration}`))];
          warning = `Disciplina salva, exceto ${skipped.map((c) => optional[c].label).join(', ')}: falta rodar ${migrations.join(' e ')} no Supabase (voltam ao valor anterior ao recarregar).`;
        }
      }
    }

    const apply = (s: Subject): Subject => ({
      ...s,
      code,
      name,
      professors,
      nextClass: schedule,
      schedule: schedule || s.schedule,
      description,
      topics,
    });
    setSubjects((prev) => prev.map((s) => (s.id === subjectId ? apply(s) : s)));
    setSelectedSubject((prev) => (prev?.id === subjectId ? apply(prev) : prev));
    setTasks((prev) => prev.map((t) => (t.subjectId === subjectId ? { ...t, subjectName: name } : t)));
    return { warning };
  };

  const deleteSubject = async (subjectId: string): Promise<SubjectDeleteSummary> => {
    const subject = subjects.find((s) => s.id === subjectId);
    if (!subject) throw new Error('Disciplina não encontrada.');
    if (!userId) throw new Error('Sessão expirada. Entre novamente para excluir a disciplina.');

    const ids = (await findDbSubjectRows(userId, subject)).map((r) => r.id);
    let dbTasks: { id: string; classroom_id: string | null; importado_classroom: boolean }[] = [];
    if (ids.length > 0) {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, classroom_id, importado_classroom')
        .eq('user_id', userId)
        .in('subject_id', ids);
      if (error) throw new Error(`Erro ao ler as tarefas da disciplina: ${error.message}`);
      dbTasks = (data || []) as typeof dbTasks;

      // Tasks first (only this subject's, only this user's), then the subject itself.
      const { error: tasksError } = await supabase
        .from('tasks')
        .delete()
        .eq('user_id', userId)
        .in('subject_id', ids);
      if (tasksError) throw new Error(`Erro ao excluir as tarefas da disciplina: ${tasksError.message}`);
      const { error: subjectError } = await supabase.from('subjects').delete().eq('user_id', userId).in('id', ids);
      if (subjectError) throw new Error(`Erro ao excluir a disciplina: ${subjectError.message}`);
    }

    const localTasks = tasks.filter((t) => t.subjectId === subjectId);
    const fromClassroom =
      dbTasks.some((t) => t.classroom_id || t.importado_classroom) ||
      localTasks.some((t) => t.importedFromClassroom || t.classroomId);

    let ignoredStorage: 'db' | 'local' | undefined;
    if (fromClassroom) {
      const keys = ignoredKeysForSubject(subject.name, [
        ...dbTasks.map((t) => t.classroom_id),
        ...localTasks.map((t) => t.classroomId),
      ]);
      const items = keys.map((courseKey) => ({ courseKey, courseName: subject.name }));
      ignoredStorage = await addIgnoredCourses(userId, items);
      setIgnoredCourses((prev) => [...prev.filter((c) => !keys.includes(c.courseKey)), ...items]);
    }

    if (ids.length > 0) {
      const stored = loadClassroomSubjectData(userId);
      ids.forEach((id) => delete stored[id]);
      saveClassroomSubjectData(userId, stored);
    }

    const deletedIds = new Set(dbTasks.map((t) => t.id));
    setSubjects((prev) => prev.filter((s) => s.id !== subjectId));
    setSelectedSubject((prev) => (prev?.id === subjectId ? null : prev));
    setTasks((prev) => prev.filter((t) => t.subjectId !== subjectId && !deletedIds.has(t.id)));

    return {
      deletedTasks: ids.length > 0 ? dbTasks.length : localTasks.length,
      ignoredInClassroom: fromClassroom,
      ignoredStorage,
    };
  };

  const restoreIgnoredCourse = async (courseName: string) => {
    if (!userId) return;
    const keys = ignoredCourses.filter((c) => c.courseName === courseName).map((c) => c.courseKey);
    await removeIgnoredCourses(userId, keys);
    setIgnoredCourses((prev) => prev.filter((c) => !keys.includes(c.courseKey)));
  };

  const updateTaskStatus = (id: string, status: TaskStatus) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id === id) {
          if (status === 'completed' && task.status !== 'completed') {
            confetti({
              particleCount: 70,
              spread: 60,
              origin: { y: 0.7 },
              colors: ['#0ea5e9', '#f59e0b', '#10b981', '#6366f1'],
            });
          }
          return { ...task, status };
        }
        return task;
      })
    );

    // Updates the row by its UUID only (never by title, which could hit another task with the same name).
    (async () => {
      try {
        if (isUuid(id) && userId) {
          const { error } = await supabase.from('tasks').update({ status }).eq('id', id).eq('user_id', userId);
          if (error) console.warn('Erro ao atualizar status no Supabase:', error.message);
        } else {
          console.warn('Tarefa ainda sem id do banco; status não foi salvo no Supabase:', id);
        }
      } catch (e) {
        console.warn('Erro ao atualizar status no Supabase:', e);
      }
    })();
  };

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== id));

    // Deletes the row by its UUID only (never by title, which could delete every task with the same name).
    (async () => {
      try {
        if (isUuid(id) && userId) {
          const { error } = await supabase.from('tasks').delete().eq('id', id).eq('user_id', userId);
          if (error) console.warn('Erro ao excluir tarefa no Supabase:', error.message);
        }
      } catch (e) {
        console.warn('Erro ao excluir tarefa no Supabase:', e);
      }
    })();
  };

  const logStudyTime = (subjectId: string, minutes: number) => {
    const addedHours = Number((minutes / 60).toFixed(1));
    setSubjects((prev) => {
      const updated = prev.map((subj) => {
        if (subj.id === subjectId) {
          const newStudyHours = subj.studyTimeHours + addedHours;
          const newCompletedHours = Math.min(subj.totalHours, subj.completedHours + addedHours);
          const newProgress = Math.min(100, Math.round((newCompletedHours / subj.totalHours) * 100));
          return {
            ...subj,
            studyTimeHours: newStudyHours,
            completedHours: newCompletedHours,
            progress: newProgress,
          };
        }
        return subj;
      });
      persistSubjectsToStorage(updated);
      return updated;
    });
  };

  const loadExampleData = async () => {
    if (!userId) return;
    setIsLoadingData(true);
    setLoadError(null);
    try {
      const { data: existingSubs } = await supabase
        .from('subjects')
        .select('id, nome, codigo')
        .eq('user_id', userId);

      const knownSubs = [...(existingSubs || [])];
      const missingSubs = INITIAL_SUBJECTS.filter(
        (initSub) =>
          !knownSubs.some(
            (s: any) =>
              String(s.nome || '').toLowerCase() === initSub.name.toLowerCase() ||
              String(s.codigo || '').toLowerCase() === initSub.code.toLowerCase()
          )
      );

      if (missingSubs.length > 0) {
        const { data: insertedSubs } = await supabase
          .from('subjects')
          .insert(
            missingSubs.map((sub) => ({
              user_id: userId,
              codigo: sub.code,
              nome: sub.name,
              professor: sub.professors?.[0] || 'Prof. Responsável',
              carga_horaria_total: sub.totalHours || 80,
            }))
          )
          .select('id, nome, codigo');
        if (Array.isArray(insertedSubs)) {
          knownSubs.push(...insertedSubs);
        }
      }

      const { data: existingTasks } = await supabase
        .from('tasks')
        .select('titulo')
        .eq('user_id', userId);
      const existingTitles = new Set(
        (existingTasks || []).map((t: any) => String(t.titulo || '').trim().toLowerCase())
      );

      const tasksToInsert = INITIAL_TASKS.filter(
        (t) => !existingTitles.has(t.title.trim().toLowerCase())
      );

      for (const task of tasksToInsert) {
        const matchedSub = knownSubs.find(
          (s: any) =>
            String(s.nome || '').toLowerCase() === task.subjectName.toLowerCase()
        );
        if (matchedSub?.id) {
          await supabase.from('tasks').insert({
            subject_id: matchedSub.id,
            user_id: userId,
            titulo: task.title,
            descricao: task.description || '',
            data_entrega: task.dueDate ? new Date(task.dueDate).toISOString() : null,
            status: task.status,
            prioridade: task.priority,
            // Sample data is never flagged as a Classroom import.
            importado_classroom: false,
          });
        }
      }

      // Reload from the database so the sample cards carry real UUIDs (status changes then persist).
      const { dbSubjects, dbTasks } = await fetchDbRows(userId);
      applyDbSnapshot(dbSubjects, dbTasks);
    } catch (err: any) {
      setLoadError(err?.message || 'Erro ao carregar dados de exemplo.');
    } finally {
      setIsLoadingData(false);
    }
  };

  const resetToDefault = () => {
    setSubjects([]);
    setTasks([]);
    const subKey = getScopedKey(STORAGE_KEYS.SUBJECTS, userId);
    const taskKey = getScopedKey(STORAGE_KEYS.TASKS, userId);
    if (subKey) localStorage.removeItem(subKey);
    if (taskKey) localStorage.removeItem(taskKey);
  };

  const subjectsWithRealProgress = useMemo(() => {
    // Fixed order by code (then name): the database returns an edited row last, which made it jump around.
    const ordered = [...subjects].sort(compareSubjects);
    return ordered.map((subj) => {
      const subTasks = tasks.filter(
        (t) =>
          t.subjectId === subj.id ||
          t.subjectName.toLowerCase() === subj.name.toLowerCase()
      );
      if (subTasks.length === 0) {
        return { ...subj, progress: 0 };
      }
      const done = subTasks.filter((t) => t.status === 'completed').length;
      const pct = Math.round((done / subTasks.length) * 100);
      return { ...subj, progress: pct };
    });
  }, [subjects, tasks]);

  return (
    <PlannerContext.Provider
      value={{
        subjects: subjectsWithRealProgress,
        tasks,
        activeTab,
        setActiveTab,
        selectedSubject,
        setSelectedSubject,
        studentName,
        setStudentName,
        addSubject,
        updateSubject,
        deleteSubject,
        ignoredCourses,
        restoreIgnoredCourse,
        addTask,
        applyClassroomSyncResult,
        isClassroomModalOpen,
        setIsClassroomModalOpen,
        lastClassroomSync,
        updateTaskStatus,
        deleteTask,
        logStudyTime,
        isNewTaskModalOpen,
        setIsNewTaskModalOpen,
        isLoadingData,
        isPlannerReady,
        loadError,
        loadExampleData,
        resetToDefault,
      }}
    >
      {children}
    </PlannerContext.Provider>
  );
};

export const usePlanner = () => {
  const context = useContext(PlannerContext);
  if (!context) {
    throw new Error('usePlanner must be used within a PlannerProvider');
  }
  return context;
};
