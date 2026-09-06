export type Priority = 'critica' | 'alta' | 'media' | 'baixa';
export type TaskStatus = 'todo' | 'in_progress' | 'completed';
export type TaskType = 'avaliacao_mvp' | 'avaliacao' | 'exercicio' | 'lista' | 'laboratorio' | 'leitura' | 'projeto' | 'revisao';

export interface Evaluation {
  id: string;
  name: string;
  date: string; // ISO format or DD/MM
  weight: number; // percentage
  status: 'pending' | 'completed';
  grade?: number;
}

export interface StudyMaterial {
  id: string;
  title: string;
  category: 'apostila' | 'livro' | 'laboratorio' | 'cheatsheet' | 'artigo';
  format: string; // 'PDF' | 'Livro / Referência' | 'Repositório GitHub' | 'Guia Rápido'
  description: string;
  badge: string;
}

export interface SubjectModule {
  id: string;
  number: number;
  title: string;
  hours: number;
  description: string;
  topics: string[];
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  professors: string[]; // e.g. ["Prof. Evandro"], ["Prof. Odair", "Prof. João Roberto"]
  progress: number; // percentage 0 - 100
  totalHours: number;
  completedHours: number;
  studyTimeHours: number; // For donut chart distribution
  color: string; // hex
  accentColor: string; // tailwind color class or hex
  nextClass: string;
  schedule: string;
  room: string;
  description: string;
  topics: string[];
  modules?: SubjectModule[];
  materials?: StudyMaterial[];
  evaluations: Evaluation[];
}

export interface Task {
  id: string;
  title: string;
  subjectId: string;
  subjectName: string;
  dueDate: string; // YYYY-MM-DD
  dueTime?: string;
  priority: Priority;
  status: TaskStatus;
  type: TaskType;
  description: string;
  isCriticalMvp?: boolean;
  scoreWeight?: string;
}

export interface StudySession {
  id: string;
  subjectId: string;
  subjectName: string;
  durationMinutes: number;
  date: string;
  topic: string;
}

export type ViewTab = 'dashboard' | 'disciplinas' | 'tarefas' | 'timer' | 'ai-assistant';

export interface User {
  id: string;
  name: string;
  email: string;
  semester: string;
  course: string;
  institution: string;
  password?: string;
  avatar?: string;
  createdAt?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  currentUser: User | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterData {
  name: string;
  email: string;
  course: string;
  semester: string;
  password: string;
}
