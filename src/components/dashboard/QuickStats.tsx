import React from 'react';
import type { Subject, Task } from '../../types';
import { BookCheck, TrendingUp, Clock, AlertTriangle } from 'lucide-react';

interface QuickStatsProps {
  subjects: Subject[];
  tasks: Task[];
}

export const QuickStats: React.FC<QuickStatsProps> = ({ subjects, tasks }) => {
  // Average progress across all subjects
  const avgProgress = subjects.length > 0
    ? Math.round(subjects.reduce((sum, s) => sum + s.progress, 0) / subjects.length)
    : 0;

  // Total study hours
  const totalStudyHours = subjects.reduce((sum, s) => sum + s.studyTimeHours, 0);

  // Completed tasks count
  const completedTasksCount = tasks.filter(t => t.status === 'completed').length;
  const pendingCriticalCount = tasks.filter(t => (t.isCriticalMvp || (t.type === 'avaliacao' && t.priority === 'critica')) && t.status !== 'completed').length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 bg-transparent">
      {/* Stat 1: Semestre Progress */}
      <div className="bg-transparent py-2 relative overflow-hidden transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300">Progresso Geral</span>
          <div className="text-emerald-400">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-2.5 flex items-baseline gap-2">
          <span className="text-3xl font-black text-white font-mono">{avgProgress}%</span>
          <span className="text-xs text-emerald-400 font-semibold font-mono">Impacta 2026.2</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-slate-800/80 mt-3 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
            style={{ width: `${avgProgress}%` }}
          />
        </div>
      </div>

      {/* Stat 2: Total Study Hours */}
      <div className="bg-transparent py-2 relative overflow-hidden transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300">Horas de Estudo</span>
          <div className="text-sky-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-2.5 flex items-baseline gap-2">
          <span className="text-3xl font-black text-white font-mono">{totalStudyHours}h</span>
          <span className="text-xs text-sky-400 font-medium">tempo registrado</span>
        </div>
        <p className="text-xs text-slate-300 mt-2.5 truncate">
          Maior foco: <strong className="text-white">Programming & Alg.</strong>
        </p>
      </div>

      {/* Stat 3: Critical Deliveries */}
      <div className="bg-transparent py-2 relative overflow-hidden transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-amber-400">Avaliações Parciais</span>
          <div className="text-amber-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-2.5 flex items-baseline gap-2">
          <span className="text-3xl font-black text-amber-300 font-mono">{pendingCriticalCount}</span>
          <span className="text-xs text-amber-400 font-semibold">prazos críticos</span>
        </div>
        <p className="text-xs text-amber-300/90 mt-2.5 font-medium truncate">
          Entregas em 08/09 e 10/09
        </p>
      </div>

      {/* Stat 4: Tasks Done */}
      <div className="bg-transparent py-2 relative overflow-hidden transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300">Tarefas Realizadas</span>
          <div className="text-indigo-400">
            <BookCheck className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-2.5 flex items-baseline gap-2">
          <span className="text-3xl font-black text-white font-mono">{completedTasksCount} / {tasks.length}</span>
          <span className="text-xs text-indigo-400 font-semibold font-mono">
            {tasks.length > 0 ? Math.round((completedTasksCount / tasks.length) * 100) : 0}%
          </span>
        </div>
        <p className="text-xs text-slate-300 mt-2.5 truncate">
          5 disciplinas em andamento
        </p>
      </div>
    </div>
  );
};
