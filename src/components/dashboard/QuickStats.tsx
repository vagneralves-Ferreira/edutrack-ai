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
  const taskCompletionPercent = tasks.length > 0 ? Math.round((completedTasksCount / tasks.length) * 100) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
      {/* Stat 1: Semestre Progress */}
      <div className="bento-card-interactive rounded-2xl p-5 relative overflow-hidden">
        <div className="pointer-events-none absolute -right-6 -top-6 w-24 h-24 rounded-full bg-emerald-500/10 blur-2xl" />
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Progresso Geral</span>
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-black text-white font-mono tracking-tight">{avgProgress}%</span>
          <span className="text-[11px] text-emerald-400 font-semibold font-mono px-2 py-0.5 rounded-full bg-emerald-500/10">
            Impacta 2026.2
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-white/[0.06] mt-3.5 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
            style={{ width: `${avgProgress}%` }}
          />
        </div>
      </div>

      {/* Stat 2: Total Study Hours */}
      <div className="bento-card-interactive rounded-2xl p-5 relative overflow-hidden">
        <div className="pointer-events-none absolute -right-6 -top-6 w-24 h-24 rounded-full bg-sky-500/10 blur-2xl" />
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Horas de Estudo</span>
          <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-black text-white font-mono tracking-tight">{totalStudyHours}h</span>
          <span className="text-[11px] text-sky-400 font-medium px-2 py-0.5 rounded-full bg-sky-500/10">
            acumuladas
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-3 truncate">
          Maior foco: <strong className="text-slate-200 font-semibold">Programming & Alg.</strong>
        </p>
      </div>

      {/* Stat 3: Critical Deliveries */}
      <div className="bento-card-interactive rounded-2xl p-5 relative overflow-hidden border-amber-500/20">
        <div className="pointer-events-none absolute -right-6 -top-6 w-24 h-24 rounded-full bg-amber-500/15 blur-2xl" />
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-amber-300/90 uppercase tracking-wider">Prazos Críticos</span>
          <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-black text-amber-300 font-mono tracking-tight">{pendingCriticalCount}</span>
          <span className="text-[11px] text-amber-300 font-semibold px-2 py-0.5 rounded-full bg-amber-500/15">
            avaliações parciais
          </span>
        </div>
        <p className="text-xs text-amber-200/80 mt-3 font-medium truncate">
          Entregas em 08/09 e 10/09
        </p>
      </div>

      {/* Stat 4: Tasks Done */}
      <div className="bento-card-interactive rounded-2xl p-5 relative overflow-hidden">
        <div className="pointer-events-none absolute -right-6 -top-6 w-24 h-24 rounded-full bg-indigo-500/10 blur-2xl" />
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tarefas Concluídas</span>
          <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <BookCheck className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-black text-white font-mono tracking-tight">
            {completedTasksCount}<span className="text-lg text-slate-500 font-bold">/{tasks.length}</span>
          </span>
          <span className="text-[11px] text-indigo-300 font-semibold font-mono px-2 py-0.5 rounded-full bg-indigo-500/15">
            {taskCompletionPercent}%
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-white/[0.06] mt-3.5 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-400 transition-all duration-500"
            style={{ width: `${taskCompletionPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
};
