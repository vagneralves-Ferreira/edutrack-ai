import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { Subject, Task, TaskStatus, ViewTab } from '../types';
import { INITIAL_SUBJECTS, INITIAL_TASKS } from '../data/initialData';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import confetti from 'canvas-confetti';
import { buildFullClassroomImpactaSync, type ClassroomSyncResult } from '../services/classroomSync';

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
  resetToDefault: () => void;
}

const PlannerContext = createContext<PlannerContextType | undefined>(undefined);

const STORAGE_KEYS = {
  SUBJECTS: 'edutrack_subjects_v3',
  SUBJECTS_LEGACY: 'edutrack_subjects',
  TASKS: 'edutrack_tasks_v4',
  STUDENT_NAME: 'edutrack_student_name_v1',
};

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

  const profArray =
    Array.isArray(raw.professors) && raw.professors.length > 0
      ? raw.professors
      : raw.professor
      ? [String(raw.professor)]
      : matchedInitial?.professors || ['Prof. Responsável'];

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

function loadSubjectsFromStorage(): Subject[] {
  try {
    const savedV3 = localStorage.getItem(STORAGE_KEYS.SUBJECTS);
    const savedLegacy = localStorage.getItem(STORAGE_KEYS.SUBJECTS_LEGACY);

    const parsedV3 = savedV3 ? JSON.parse(savedV3) : null;
    const parsedLegacy = savedLegacy ? JSON.parse(savedLegacy) : null;

    const candidate =
      Array.isArray(parsedLegacy) && (!Array.isArray(parsedV3) || parsedLegacy.length > parsedV3.length)
        ? parsedLegacy
        : parsedV3;

    if (Array.isArray(candidate) && candidate.length > 0) {
      const normalized = candidate.map(normalizeSubject);
      const initialIds = INITIAL_SUBJECTS.map((s) => s.id);
      const canonicalOrdered = INITIAL_SUBJECTS.map(
        (initSub) => normalized.find((n) => n.id === initSub.id) || initSub
      );
      const customAdded = normalized.filter((n) => !initialIds.includes(n.id));
      return [...canonicalOrdered, ...customAdded];
    }
  } catch (e) {
    console.error('Error loading subjects from localStorage', e);
  }
  return INITIAL_SUBJECTS;
}

function persistSubjectsToStorage(subjectsList: Subject[]) {
  try {
    const serialized = JSON.stringify(subjectsList);
    localStorage.setItem(STORAGE_KEYS.SUBJECTS, serialized);
    localStorage.setItem(STORAGE_KEYS.SUBJECTS_LEGACY, serialized);
  } catch (e) {
    console.error('Error saving subjects to localStorage', e);
  }
}

export const PlannerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();

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

  const [subjects, setSubjects] = useState<Subject[]>(() => loadSubjectsFromStorage());
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(() => subjects[0] || null);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState<boolean>(false);
  const [isClassroomModalOpen, setIsClassroomModalOpen] = useState<boolean>(false);
  const [lastClassroomSync, setLastClassroomSync] = useState<ClassroomSyncMetadata | null>(() => {
    try {
      const saved = localStorage.getItem('edutrack_classroom_sync_meta');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [studentNameState, setStudentNameState] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.STUDENT_NAME) || 'Alexandre (Impacta)';
  });

  const studentName = currentUser?.name || studentNameState;

  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TASKS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error loading tasks from localStorage', e);
      }
    }
    return INITIAL_TASKS;
  });

  // Sincronização inicial com o Supabase (SELECT nas tabelas subjects e tasks)
  useEffect(() => {
    const fetchFromSupabase = async () => {
      try {
        // 1. Buscar disciplinas no Supabase
        const { data: dbSubjects } = await supabase.from('subjects').select('*');

        // 2. Buscar tarefas no Supabase
        const { data: dbTasks, error: tasksError } = await supabase
          .from('tasks')
          .select('*')
          .order('created_at', { ascending: false });

        // Reconciliação de disciplinas se existir usuário autenticado
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData?.user?.id;

        if (userId) {
          await supabase.from('profiles').upsert(
            {
              id: userId,
              nome: studentName,
              curso: 'Ciência da Computação',
              semestre_atual: '2026.2',
            },
            { onConflict: 'id' }
          );

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

          const missingLocalSubjects = subjects.filter(
            (localSub) =>
              !uniqueDbSubjects.some(
                (dbSub) =>
                  dbSub.name.toLowerCase() === localSub.name.toLowerCase() ||
                  dbSub.code.toLowerCase() === localSub.code.toLowerCase()
              )
          );

          if (missingLocalSubjects.length > 0) {
            await supabase.from('subjects').insert(
              missingLocalSubjects.map((sub) => ({
                user_id: userId,
                codigo: sub.code,
                nome: sub.name,
                professor: sub.professors?.[0] || 'Prof. Responsável',
                carga_horaria_total: sub.totalHours || 80,
              }))
            );
          }

          const reconciledSubjects: Subject[] = [...uniqueDbSubjects, ...missingLocalSubjects];
          setSubjects(reconciledSubjects);
          persistSubjectsToStorage(reconciledSubjects);
        }

        if (tasksError) {
          console.warn('Aviso ao consultar tasks no Supabase:', tasksError.message);
          return;
        }

        if (dbTasks && dbTasks.length > 0) {
          const mappedTasks: Task[] = dbTasks.map((row: any) => {
            const dbSub = dbSubjects?.find((s: any) => s.id === row.subject_id);
            const matchedLocalSub =
              subjects.find(
                (s) =>
                  s.id === row.subject_id ||
                  (dbSub &&
                    (s.name.toLowerCase() === String(dbSub.nome || '').toLowerCase() ||
                      s.code.toLowerCase() === String(dbSub.codigo || '').toLowerCase()))
              ) || subjects[0];

            const dateStr = row.data_entrega
              ? String(row.data_entrega).split('T')[0]
              : new Date().toISOString().split('T')[0];

            return {
              id: String(row.id),
              title: String(row.titulo || 'Tarefa'),
              subjectId: matchedLocalSub ? matchedLocalSub.id : String(row.subject_id || 'sql-fundamentals'),
              subjectName: matchedLocalSub ? matchedLocalSub.name : 'Disciplina',
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

          setTasks(mappedTasks);
        }
      } catch (err) {
        console.warn('Conexão com Supabase em modo fallback local:', err);
      }
    };

    fetchFromSupabase();
  }, [currentUser]);

  // Função auxiliar para garantir vínculo de usuário e disciplina (UUID) no Supabase
  const resolveSupabaseIds = async (localSubjectId: string, localSubjectName?: string) => {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id;
    if (!userId) return null;

    // Garante que o perfil existe na tabela profiles
    await supabase.from('profiles').upsert(
      {
        id: userId,
        nome: studentName,
        curso: 'Ciência da Computação',
        semestre_atual: '2026.2',
      },
      { onConflict: 'id' }
    );

    const localSub =
      subjects.find((s) => s.id === localSubjectId || s.name === localSubjectName) || subjects[0];

    // Procura a disciplina correspondente no Supabase
    const { data: existingSub } = await supabase
      .from('subjects')
      .select('id')
      .eq('user_id', userId)
      .ilike('nome', localSub.name)
      .maybeSingle();

    if (existingSub?.id) {
      return { userId, subjectUuid: existingSub.id };
    }

    // Se ainda não existir no banco, insere a disciplina e retorna o UUID gerado
    const { data: createdSub } = await supabase
      .from('subjects')
      .insert({
        user_id: userId,
        codigo: localSub.code || 'IMP-01',
        nome: localSub.name,
        professor: localSub.professors?.[0] || 'Prof. Impacta',
        carga_horaria_total: localSub.totalHours || 80,
      })
      .select('id')
      .single();

    return createdSub?.id ? { userId, subjectUuid: createdSub.id } : null;
  };

  useEffect(() => {
    persistSubjectsToStorage(subjects);
  }, [subjects]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  }, [tasks]);

  const setStudentName = (name: string) => {
    setStudentNameState(name);
    localStorage.setItem(STORAGE_KEYS.STUDENT_NAME, name);
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

    setSubjects((prev) => {
      const updated = [...prev, newSub];
      persistSubjectsToStorage(updated);
      return updated;
    });
    setSelectedSubject(newSub);

    // Sincroniza nova disciplina com o Supabase em segundo plano
    (async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user?.id) {
          await supabase.from('subjects').insert({
            user_id: authData.user.id,
            codigo: newSub.code,
            nome: newSub.name,
            professor: newSub.professors[0],
            carga_horaria_total: newSub.totalHours,
          });
        }
      } catch (e) {
        console.warn('Erro ao salvar disciplina no Supabase:', e);
      }
    })();

    return newSub;
  };

  const addTask = (newTaskData: Omit<Task, 'id'>) => {
    const tempId = 'task-' + Date.now();
    const newTask: Task = {
      ...newTaskData,
      id: tempId,
      status: 'todo',
      importedFromClassroom: false,
    };

    setTasks((prev) => {
      const updated = [newTask, ...prev];
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(updated));
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
            prev.map((t) => (t.id === tempId ? { ...t, id: String(data.id) } : t))
          );
        }
      } catch (e) {
        console.warn('Erro ao inserir tarefa no Supabase:', e);
      }
    })();
  };

  const applyClassroomSyncResult = async (result: ClassroomSyncResult): Promise<void> => {
    // 1. Atualiza todas as disciplinas (com materiais, módulos, professores, avaliações e progresso)
    setSubjects(result.subjects);
    persistSubjectsToStorage(result.subjects);
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
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(merged));
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
    localStorage.setItem('edutrack_classroom_sync_meta', JSON.stringify(meta));

    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.65 },
      colors: ['#34a853', '#4285f4', '#fbbc05', '#8b5cf6'],
    });

    // 4. Sincroniza disciplinas e tarefas com o Supabase
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;
      if (userId) {
        for (const subj of result.subjects) {
          await supabase.from('subjects').upsert(
            {
              user_id: userId,
              codigo: subj.code,
              nome: subj.name,
              professor: subj.professors.join(', '),
              carga_horaria_total: subj.totalHours,
            },
            { onConflict: 'codigo' }
          ).catch(() => {});
        }
      }

      for (const clsTask of result.tasks) {
        const ids = await resolveSupabaseIds(clsTask.subjectId, clsTask.subjectName);
        if (ids) {
          await supabase.from('tasks').insert({
            subject_id: ids.subjectUuid,
            user_id: ids.userId,
            titulo: clsTask.title,
            descricao: clsTask.description || '',
            data_entrega: clsTask.dueDate ? new Date(clsTask.dueDate).toISOString() : null,
            status: clsTask.status,
            prioridade: clsTask.priority,
            importado_classroom: true,
          }).catch(() => {});
        }
      }
    } catch (e) {
      console.warn('Erro ao sincronizar pacote completo do Classroom com Supabase:', e);
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

  const resetToDefault = () => {
    setSubjects(INITIAL_SUBJECTS);
    setTasks(INITIAL_TASKS);
    localStorage.removeItem(STORAGE_KEYS.SUBJECTS);
    localStorage.removeItem(STORAGE_KEYS.SUBJECTS_LEGACY);
    localStorage.removeItem(STORAGE_KEYS.TASKS);
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