import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { Subject, Task, TaskStatus, ViewTab } from '../types';
import { INITIAL_SUBJECTS, INITIAL_TASKS } from '../data/initialData';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import confetti from 'canvas-confetti';
import {
  buildFullClassroomImpactaSync,
  isCorruptedCodeTask,
  type ClassroomSyncResult,
} from '../services/classroomSync';

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
  addTask: (task: Omit<Task, 'id'>) => void;
  importClassroomTasks: () => number;
  applyClassroomSyncResult: (result: ClassroomSyncResult) => Promise<void>;
  isClassroomModalOpen: boolean;
  setIsClassroomModalOpen: (open: boolean) => void;
  lastClassroomSync: ClassroomSyncMetadata | null;
  updateTaskStatus: (id: string, status: TaskStatus) => void;
  deleteTask: (id: string) => void;
  logStudyTime: (subjectId: string, minutes: number) => void;
  isNewTaskModalOpen: boolean;
  setIsNewTaskModalOpen: (open: boolean) => void;
  isLoadingData: boolean;
  loadError: string | null;
  loadExampleData: () => Promise<void>;
  resetToDefault: () => void;
}

const PlannerContext = createContext<PlannerContextType | undefined>(undefined);

const STORAGE_KEYS = {
  SUBJECTS: 'edutrack_subjects_v6',
  SUBJECTS_LEGACY: 'edutrack_subjects_v5',
  TASKS: 'edutrack_tasks_v6',
  STUDENT_NAME: 'edutrack_student_name_v1',
  SYNC_META: 'edutrack_classroom_sync_meta',
};

function getScopedKey(base: string, userId?: string | null): string | null {
  return userId ? `${base}_${userId}` : null;
}

const CLASSROOM_MOCK_TASKS: Task[] = [
  {
    id: 'classroom-1',
    title: 'Desafio da Procedure',
    subjectId: 'sql-fundamentals',
    subjectName: 'SQL Fundamentals',
    dueDate: '2026-11-07',
    dueTime: '23:59',
    priority: 'alta',
    status: 'todo',
    type: 'exercicio',
    isCriticalMvp: false,
    description: 'Atividade importada do mural do professor Evandro.',
    importedFromClassroom: true,
  },
  {
    id: 'classroom-2',
    title: 'Tarefas a serem realizadas',
    subjectId: 'innovation-lab',
    subjectName: 'Innovation Lab: Advanced No/Low Code',
    dueDate: '2026-11-19',
    dueTime: '23:59',
    priority: 'media',
    status: 'todo',
    type: 'lista',
    isCriticalMvp: false,
    description: 'Realizar o upload das tarefas (Markdown e Docs).',
    importedFromClassroom: true,
  },
  {
    id: 'classroom-3',
    title: 'Entrega final do Projeto',
    subjectId: 'innovation-lab',
    subjectName: 'Innovation Lab: Advanced No/Low Code',
    dueDate: '2026-11-23',
    dueTime: '23:59',
    priority: 'alta',
    status: 'in_progress',
    type: 'avaliacao_mvp',
    isCriticalMvp: true,
    description: 'Sincronizado do Classroom. Entrega do MVP.',
    importedFromClassroom: true,
  },
  {
    id: 'classroom-4',
    title: 'Avaliação Parcial 02',
    subjectId: 'software-engineering',
    subjectName: 'Software Engineering',
    dueDate: '2026-10-21',
    dueTime: '23:59',
    priority: 'alta',
    status: 'completed',
    type: 'avaliacao',
    isCriticalMvp: false,
    description: 'Avaliação sobre os modelos de desenvolvimento.',
    importedFromClassroom: true,
  },
  {
    id: 'classroom-5',
    title: 'TA: Uso do Modelo Cascata',
    subjectId: 'software-engineering',
    subjectName: 'Software Engineering',
    dueDate: '2026-08-22',
    dueTime: '23:59',
    priority: 'media',
    status: 'completed',
    type: 'projeto',
    isCriticalMvp: false,
    description: 'Trabalho prático sobre as fases do Modelo Cascata.',
    importedFromClassroom: true,
  },
  {
    id: 'classroom-6',
    title: 'Dinâmica Modelos de Desenvolvimento',
    subjectId: 'software-engineering',
    subjectName: 'Software Engineering',
    dueDate: '2026-09-02',
    dueTime: '23:59',
    priority: 'baixa',
    status: 'completed',
    type: 'exercicio',
    isCriticalMvp: false,
    description: 'Atividade em grupo sobre principais diagramas da UML 2.5.',
    importedFromClassroom: true,
  },
];

const LEGACY_TASK_IDS = new Set([
  'task-mvp-01',
  'task-mvp-02',
  'task-mvp-03',
  'task-04',
  'task-05',
  'task-06',
  'task-07',
  'task-08',
  'task-09',
  'task-10',
]);

function normalizeSubject(raw: any): Subject {
  const matchedInitial = INITIAL_SUBJECTS.find(
    (s) =>
      s.id === raw.id ||
      s.code.toLowerCase() === String(raw.code || raw.codigo || '').toLowerCase() ||
      s.name.toLowerCase() === String(raw.name || raw.nome || '').toLowerCase()
  );

  const rawProfs =
    Array.isArray(raw.professors) && raw.professors.length > 0
      ? raw.professors.map((p: string) =>
          p.includes('Fábio e Mentores') ? 'Prof. Evandro Victor Rocha Deliberal' : p
        )
      : raw.professor
      ? [String(raw.professor).includes('Fábio e Mentores') ? 'Prof. Evandro Victor Rocha Deliberal' : String(raw.professor)]
      : matchedInitial?.professors || ['Prof. Responsável'];

  const profArray =
    matchedInitial?.id === 'innovation-lab' && rawProfs.some((p: string) => p.includes('Fábio'))
      ? ['Prof. Evandro Victor Rocha Deliberal']
      : matchedInitial?.id === 'database-design' &&
        rawProfs.some((p: string) => p.includes('Evandro') || p.includes('Colegiado de Dados'))
      ? ['Prof. João Roberto Peres Ortega']
      : rawProfs;

  return {
    id: matchedInitial ? matchedInitial.id : String(raw.id || 'subj-' + Date.now()),
    code: String(raw.code || raw.codigo || matchedInitial?.code || 'IMP-000'),
    name: String(raw.name || raw.nome || matchedInitial?.name || 'Disciplina'),
    professors: profArray,
    progress: typeof raw.progress === 'number' ? raw.progress : (matchedInitial?.progress ?? 0),
    totalHours:
      typeof raw.totalHours === 'number'
        ? raw.totalHours
        : typeof raw.carga_horaria_total === 'number'
        ? raw.carga_horaria_total
        : (matchedInitial?.totalHours ?? 80),
    completedHours:
      typeof raw.completedHours === 'number' ? raw.completedHours : (matchedInitial?.completedHours ?? 0),
    studyTimeHours:
      typeof raw.studyTimeHours === 'number' ? raw.studyTimeHours : (matchedInitial?.studyTimeHours ?? 4),
    color: raw.color || matchedInitial?.color || '#3b82f6',
    accentColor: raw.accentColor || matchedInitial?.accentColor || 'from-sky-500 to-blue-600',
    nextClass: raw.nextClass || matchedInitial?.nextClass || 'A definir • 19:15',
    schedule: raw.schedule || matchedInitial?.schedule || 'Semestre 2026.2 • 19:15 - 22:00',
    room: raw.room || matchedInitial?.room || 'Campus Paulista / Online',
    description:
      raw.description ||
      matchedInitial?.description ||
      'Disciplina cadastrada no planner acadêmico da Faculdade Impacta Tecnologia.',
    topics: Array.isArray(raw.topics) ? raw.topics : (matchedInitial?.topics || []),
    modules: Array.isArray(raw.modules) ? raw.modules : (matchedInitial?.modules || []),
    materials: Array.isArray(raw.materials) ? raw.materials : (matchedInitial?.materials || []),
    evaluations: Array.isArray(raw.evaluations) ? raw.evaluations : (matchedInitial?.evaluations || []),
  };
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
  const [loadError, setLoadError] = useState<string | null>(null);

  // Limpa e recarrega o estado em memória quando o usuário faz logout ou troca de conta
  useEffect(() => {
    const scopedSubs = loadSubjectsFromStorage(userId);
    const scopedTasks = loadTasksFromStorage(userId);
    const scopedSync = loadSyncMetaFromStorage(userId);
    const nameKey = getScopedKey(STORAGE_KEYS.STUDENT_NAME, userId);
    setSubjects(scopedSubs);
    setSelectedSubject(scopedSubs[0] || null);
    setTasks(scopedTasks);
    setLastClassroomSync(scopedSync);
    setLoadError(null);
    setStudentNameState((nameKey && localStorage.getItem(nameKey)) || currentUser?.name || 'Estudante');
  }, [userId]);

  // Sincronização inicial com o Supabase (SELECT nas tabelas subjects e tasks — sem auto-seed ou fallback mock)
  useEffect(() => {
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

        const mappedDbSubjects: Subject[] = (dbSubjects || []).map(normalizeSubject);
        const uniqueDbSubjects: Subject[] = [];
        for (const dbSub of mappedDbSubjects) {
          const alreadyAdded = uniqueDbSubjects.some(
            (s) =>
              s.name.toLowerCase() === dbSub.name.toLowerCase() ||
              s.code.toLowerCase() === dbSub.code.toLowerCase()
          );
          if (!alreadyAdded) {
            uniqueDbSubjects.push(dbSub);
          }
        }

        setSubjects(uniqueDbSubjects);
        setSelectedSubject((prev) =>
          prev && uniqueDbSubjects.some((s) => s.id === prev.id)
            ? prev
            : uniqueDbSubjects[0] || null
        );
        persistSubjectsToStorage(uniqueDbSubjects, userId);

        if (dbTasks && dbTasks.length > 0) {
          const mappedTasks: Task[] = dbTasks.map((row: any) => {
            const dbSub = dbSubjects?.find((s: any) => s.id === row.subject_id);
            const matchedLocalSub =
              uniqueDbSubjects.find(
                (s) =>
                  s.id === row.subject_id ||
                  (dbSub &&
                    (s.name.toLowerCase() === String(dbSub.nome || '').toLowerCase() ||
                      s.code.toLowerCase() === String(dbSub.codigo || '').toLowerCase()))
              ) || uniqueDbSubjects[0];

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
            };
          });

          const cleanDbTasks = mappedTasks.filter((t) => !isCorruptedCodeTask(t));
          setTasks(cleanDbTasks);
          const tasksKey = getScopedKey(STORAGE_KEYS.TASKS, userId);
          if (tasksKey) localStorage.setItem(tasksKey, JSON.stringify(cleanDbTasks));
        } else {
          setTasks([]);
          const tasksKey = getScopedKey(STORAGE_KEYS.TASKS, userId);
          if (tasksKey) localStorage.setItem(tasksKey, JSON.stringify([]));
        }
      } catch (err: any) {
        setLoadError(err?.message || 'Erro ao conectar com o Supabase.');
      } finally {
        setIsLoadingData(false);
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
      nextClass: 'Horário a definir',
      schedule: 'Semestre 2026.2',
      room: 'Campus Paulista / Online',
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

  const applyClassroomSyncResult = async (result: ClassroomSyncResult): Promise<void> => {
    if (syncInFlightRef.current) return;
    syncInFlightRef.current = true;
    try {
    // 1. Atualiza todas as disciplinas (com materiais, módulos, professores, avaliações e progresso)
    setSubjects(result.subjects);
    persistSubjectsToStorage(result.subjects, userId);
    if (result.subjects.length > 0) {
      setSelectedSubject((prev) => {
        if (!prev) return result.subjects[0];
        return result.subjects.find((s) => s.id === prev.id) || result.subjects[0];
      });
    }

    // 2. Atualiza todas as tarefas mantendo tarefas manuais do aluno
    setTasks((prev) => {
      const manualTasks = prev.filter((t) => !t.importedFromClassroom && !LEGACY_TASK_IDS.has(t.id));
      const merged = [...result.tasks, ...manualTasks];
      const tasksKey = getScopedKey(STORAGE_KEYS.TASKS, userId);
      if (tasksKey) localStorage.setItem(tasksKey, JSON.stringify(merged));
      return merged;
    });

    // 3. Salva metadados da sincronização
    const meta: ClassroomSyncMetadata = {
      timestamp: new Date().toLocaleString('pt-BR'),
      coursesCount: result.stats.coursesCount,
      tasksCount: result.stats.tasksCount,
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

    // 4. Sincroniza disciplinas e tarefas com o Supabase sem duplicar
    try {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id;
      if (uid) {
        const { data: existingSubs } = await supabase
          .from('subjects')
          .select('id, nome, codigo')
          .eq('user_id', uid);

        const knownSubs = [...(existingSubs || [])];
        const findSubjectUuid = (code?: string, name?: string): string | null => {
          const hit = knownSubs.find(
            (s: any) =>
              (name && String(s.nome || '').toLowerCase() === name.toLowerCase()) ||
              (code && String(s.codigo || '').toLowerCase() === code.toLowerCase())
          );
          return hit?.id || null;
        };

        for (const subj of result.subjects) {
          if (!findSubjectUuid(subj.code, subj.name)) {
            const { data: inserted } = await supabase
              .from('subjects')
              .insert({
                user_id: uid,
                codigo: subj.code,
                nome: subj.name,
                professor: subj.professors.join(', '),
                carga_horaria_total: subj.totalHours,
              })
              .select('id, nome, codigo')
              .limit(1);
            if (Array.isArray(inserted) && inserted[0]) {
              knownSubs.push(inserted[0]);
            }
          }
        }

        // Remove tarefas anteriores importadas do Classroom para evitar duplicidade
        await supabase
          .from('tasks')
          .delete()
          .eq('user_id', uid)
          .eq('importado_classroom', true);

        for (const clsTask of result.tasks) {
          const matchedSub = result.subjects.find(
            (s) => s.id === clsTask.subjectId || s.name.toLowerCase() === clsTask.subjectName.toLowerCase()
          );
          let subjectUuid = findSubjectUuid(matchedSub?.code, clsTask.subjectName);
          if (!subjectUuid) {
            const ids = await resolveSupabaseIds(clsTask.subjectId, clsTask.subjectName);
            subjectUuid = ids?.subjectUuid || null;
          }
          if (subjectUuid) {
            await supabase.from('tasks').insert({
              subject_id: subjectUuid,
              user_id: uid,
              titulo: clsTask.title,
              descricao: clsTask.description || '',
              data_entrega: clsTask.dueDate ? new Date(clsTask.dueDate).toISOString() : null,
              status: clsTask.status,
              prioridade: clsTask.priority,
              importado_classroom: true,
            });
          }
        }
      }
    } catch (e) {
      console.warn('Erro ao sincronizar pacote completo do Classroom com Supabase:', e);
    }
    } finally {
      syncInFlightRef.current = false;
    }
  };

  const importClassroomTasks = (): number => {
    const fullResult = buildFullClassroomImpactaSync(subjects);
    void applyClassroomSyncResult(fullResult);
    return fullResult.tasks.length;
  };

  const updateTaskStatus = (id: string, status: TaskStatus) => {
    let taskTitle = '';
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id === id) {
          taskTitle = task.title;
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

    // Atualiza o status da tarefa no Supabase
    (async () => {
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        if (isUuid) {
          await supabase.from('tasks').update({ status }).eq('id', id);
        } else if (taskTitle) {
          await supabase.from('tasks').update({ status }).eq('titulo', taskTitle);
        }
      } catch (e) {
        console.warn('Erro ao atualizar status no Supabase:', e);
      }
    })();
  };

  const deleteTask = (id: string) => {
    const targetTask = tasks.find((t) => t.id === id);
    setTasks((prev) => prev.filter((task) => task.id !== id));

    // Remove a tarefa do Supabase
    (async () => {
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        if (isUuid) {
          await supabase.from('tasks').delete().eq('id', id);
        } else if (targetTask?.title) {
          await supabase.from('tasks').delete().eq('titulo', targetTask.title);
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
            importado_classroom: Boolean(task.importedFromClassroom),
          });
        }
      }

      setSubjects(INITIAL_SUBJECTS);
      setSelectedSubject(INITIAL_SUBJECTS[0] || null);
      persistSubjectsToStorage(INITIAL_SUBJECTS, userId);
      setTasks(INITIAL_TASKS);
      const tasksKey = getScopedKey(STORAGE_KEYS.TASKS, userId);
      if (tasksKey) localStorage.setItem(tasksKey, JSON.stringify(INITIAL_TASKS));
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

  return (
    <PlannerContext.Provider
      value={{
        subjects,
        tasks,
        activeTab,
        setActiveTab,
        selectedSubject,
        setSelectedSubject,
        studentName,
        setStudentName,
        addSubject,
        addTask,
        importClassroomTasks,
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