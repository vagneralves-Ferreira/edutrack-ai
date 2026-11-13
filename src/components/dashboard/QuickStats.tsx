import React from 'react';
import type { Subject, Task } from '../../types';
import { BookCheck, TrendingUp, Clock, Flame } from 'lucide-react';

interface QuickStatsProps {
  subjects: Subject[];
  tasks: Task[];
}

export const QuickStats: React.FC<QuickStatsProps> = ({ subjects, tasks }) => {
  const avgProgress = subjects.length > 0
    ? Math.round(subjects.reduce((sum, s) => sum + s.progress, 0) / subjects.length)
    : 0;

  const totalStudyHours = subjects.reduce((sum, s) => sum + s.studyTimeHours, 0);
  const completedTasksCount = tasks.filter(t => t.status === 'completed').length;
  const pendingTasksCount = tasks.filter(t => t.status !== 'completed').length;
  const taskCompletionPercent = tasks.length > 0 ? Math.round((completedTasksCount / tasks.length) * 100) : 0;
  const topSubject = subjects.length > 0
    ? [...subjects].sort((a, b) => b.studyTimeHours - a.studyTimeHours)[0]
    : null;

  return (
    <div className="grid grid-cols-2 gap-3.5 h-full">
      {/* Tile 1: Horas de Foco */}
      <div className="bento-card-interactive rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-400 to-blue-500" />
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Foco Acumulado</span>
          <div className="p-1.5 rounded-lg bg-cyan-500/15 text-cyan-400">
            <Clock className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="my-2">
          <span className="text-2xl sm:text-3xl font-black text-white font-mono">{totalStudyHours}h</span>
          <span className="block text-[10px] text-cyan-300 font-medium mt-0.5 truncate">
            Líder: {topSubject ? topSubject.name : 'SQL Fundamentals'}
          </span>
        </div>
      </div>

      {/* Tile 2: Prazos Pendentes do Classroom */}
      <div className="bento-card-interactive rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden border-rose-500/25">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-rose-500 to-orange-500" />
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300">Pendentes Classroom</span>
          <div className="p-1.5 rounded-lg bg-rose-500/15 text-rose-400">
            <Flame className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="my-2">
          <span className="text-2xl sm:text-3xl font-black text-rose-400 font-mono">{pendingTasksCount}</span>
          <span className="block text-[10px] text-rose-200/80 font-medium mt-0.5 truncate">
            Prazos: 07/11, 19/11 e 23/11
          </span>
        </div>
      </div>

      {/* Tile 3: Taxa de Entregas */}
      <div className="bento-card-interactive rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-violet-500 to-fuchsia-500" />
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Entregas</span>
          <div className="p-1.5 rounded-lg bg-violet-500/15 text-violet-400">
            <BookCheck className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-1">
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-white font-mono">
              {completedTasksCount}<span className="text-xs text-slate-500">/{tasks.length}</span>
            </span>
            <span className="text-[10px] font-mono font-bold text-violet-300">{taskCompletionPercent}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-white/[0.06] mt-2 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400"
              style={{ width: `${taskCompletionPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Tile 4: Média de Avanço */}
      <div className="bento-card-interactive rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-400 to-teal-500" />
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Avanço Médio</span>
          <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400">
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="mt-1">
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-white font-mono">{avgProgress}%</span>
            <span className="text-[10px] font-mono font-bold text-emerald-400">{subjects.length} matérias</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-white/[0.06] mt-2 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
              style={{ width: `${avgProgress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
