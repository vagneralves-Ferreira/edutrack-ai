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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* Stat 1: Semestre Progress */}
      <div className="rounded-2xl bg-[#0f1422] border border-[#1e273d] p-4.5 shadow-lg relative overflow-hidden group hover:border-[#2d3a5a] transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Progresso Geral</span>
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-black text-white font-mono">{avgProgress}%</span>
          <span className="text-[11px] text-emerald-400 font-semibold font-mono">Impacta 2026.2</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-[#182030] mt-3 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
            style={{ width: `${avgProgress}%` }}
          />
        </div>
      </div>

      {/* Stat 2: Total Study Hours */}
      <div className="rounded-2xl bg-[#0f1422] border border-[#1e273d] p-4.5 shadow-lg relative overflow-hidden group hover:border-[#2d3a5a] transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Horas de Estudo</span>
          <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-black text-white font-mono">{totalStudyHours}h</span>
          <span className="text-[11px] text-sky-400 font-medium">tempo registrado</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-2 truncate">
          Maior foco: <strong className="text-slate-200">Programming & Alg.</strong>
        </p>
      </div>

      {/* Stat 3: Critical Deliveries */}
      <div className="rounded-2xl bg-[#0f1422] border border-amber-500/30 p-4.5 shadow-lg relative overflow-hidden group hover:border-amber-500/50 transition-all bg-gradient-to-b from-[#141824] to-[#0f1422]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-amber-400">Avaliações Parciais</span>
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-black text-amber-300 font-mono">{pendingCriticalCount}</span>
          <span className="text-[11px] text-amber-400 font-semibold">prazos críticos</span>
        </div>
        <p className="text-[11px] text-amber-300/80 mt-2 font-medium truncate">
          Entregas em 08/09 e 10/09
        </p>
      </div>

      {/* Stat 4: Tasks Done */}
      <div className="rounded-2xl bg-[#0f1422] border border-[#1e273d] p-4.5 shadow-lg relative overflow-hidden group hover:border-[#2d3a5a] transition-all">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Tarefas Realizadas</span>
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
            <BookCheck className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-black text-white font-mono">{completedTasksCount} / {tasks.length}</span>
          <span className="text-[11px] text-indigo-400 font-semibold font-mono">
            {tasks.length > 0 ? Math.round((completedTasksCount / tasks.length) * 100) : 0}%
          </span>
        </div>
        <p className="text-[11px] text-slate-400 mt-2 truncate">
          5 disciplinas em andamento
        </p>
      </div>
    </div>
  );
};
