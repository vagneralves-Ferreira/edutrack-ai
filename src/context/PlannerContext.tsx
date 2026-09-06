import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { Subject, Task, TaskStatus, ViewTab } from '../types';
import { INITIAL_SUBJECTS, INITIAL_TASKS } from '../data/initialData';
import { useAuth } from './AuthContext';
import confetti from 'canvas-confetti';

interface PlannerContextType {
  subjects: Subject[];
  tasks: Task[];
  activeTab: ViewTab;
  setActiveTab: (tab: ViewTab) => void;
  selectedSubject: Subject | null;
  setSelectedSubject: (subject: Subject | null) => void;
  studentName: string;
  setStudentName: (name: string) => void;
  addTask: (task: Omit<Task, 'id'>) => void;
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
  TASKS: 'edutrack_tasks_v4',
  STUDENT_NAME: 'edutrack_student_name_v1',
};

export const PlannerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();

  // Derive activeTab from current route path
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

  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState<boolean>(false);
  const [studentNameState, setStudentNameState] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.STUDENT_NAME) || 'Alexandre (Impacta)';
  });

  const studentName = currentUser?.name || studentNameState;

  const [subjects, setSubjects] = useState<Subject[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SUBJECTS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error loading subjects from localStorage', e);
      }
    }
    return INITIAL_SUBJECTS;
  });

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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(subjects));
  }, [subjects]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  }, [tasks]);

  const setStudentName = (name: string) => {
    setStudentNameState(name);
    localStorage.setItem(STORAGE_KEYS.STUDENT_NAME, name);
  };

  const addTask = (newTaskData: Omit<Task, 'id'>) => {
    const newTask: Task = {
      ...newTaskData,
      id: 'task-' + Date.now(),
    };
    setTasks((prev) => [newTask, ...prev]);
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
              colors: ['#0ea5e9', '#f59e0b', '#10b981', '#6366f1']
            });
          }
          return { ...task, status };
        }
        return task;
      })
    );
  };

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== id));
  };

  const logStudyTime = (subjectId: string, minutes: number) => {
    const addedHours = Number((minutes / 60).toFixed(1));
    setSubjects((prev) =>
      prev.map((subj) => {
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
      })
    );
  };

  const resetToDefault = () => {
    setSubjects(INITIAL_SUBJECTS);
    setTasks(INITIAL_TASKS);
    localStorage.removeItem(STORAGE_KEYS.SUBJECTS);
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
        addTask,
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
