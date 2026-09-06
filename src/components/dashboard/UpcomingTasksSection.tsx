import React, { useState } from 'react';
import type { Task } from '../../types';
import { 
  CheckCircle2, 
  Circle, 
  Calendar, 
  AlertTriangle, 
  Flame, 
  ArrowRight,
  Plus
} from 'lucide-react';
import { usePlanner } from '../../context/PlannerContext';
import { formatDateBR, getDaysRemaining, getTaskTypeBadge, getPriorityBadge } from '../../utils/helpers';

export const UpcomingTasksSection: React.FC = () => {
  const { tasks, updateTaskStatus, setActiveTab, setIsNewTaskModalOpen } = usePlanner();
  const [filter, setFilter] = useState<'all' | 'mvp' | 'pending'>('all');

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    if (filter === 'mvp') return (task.isCriticalMvp || task.subjectId === 'innovation-lab') && task.status !== 'completed';
    if (filter === 'pending') return task.status !== 'completed';
    return true;
  });

  // Sort tasks by due date (critical evaluations first)
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const isCritA = a.isCriticalMvp || a.priority === 'critica';
    const isCritB = b.isCriticalMvp || b.priority === 'critica';
    if (isCritA && !isCritB) return -1;
    if (!isCritA && isCritB) return 1;
    return a.dueDate.localeCompare(b.dueDate);
  });

  const criticalMvpCount = tasks.filter(t => (t.isCriticalMvp || t.subjectId === 'innovation-lab') && t.status !== 'completed').length;

  return (
    <div className="rounded-2xl bg-[#0f1422] border border-[#1e273d] p-6 shadow-xl">
      {/* Header with Title and Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1c2438]">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Tarefas Próximas & Prazos Críticos
                {criticalMvpCount > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">
                    {criticalMvpCount} MVP (Innovation Lab)
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                Acompanhe entregas com destaque especial para as Avaliações Parciais e o MVP de Innovation Lab
              </p>
            </div>
          </div>
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-2">
          <div className="flex p-1 rounded-xl bg-[#141b2c] border border-[#232f4a] text-xs">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                filter === 'all' ? 'bg-[#1e273d] text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Todas ({tasks.length})
            </button>
            <button
              onClick={() => setFilter('mvp')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                filter === 'mvp' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ⭐ MVP (Innovation Lab)
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                filter === 'pending' ? 'bg-[#1e273d] text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Pendentes
            </button>
          </div>

          <button
            onClick={() => setIsNewTaskModalOpen(true)}
            className="p-2 rounded-xl bg-[#151c2d] hover:bg-[#1d263d] border border-[#232f4a] text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
            title="Nova Tarefa"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Task List */}
      <div className="mt-4 space-y-3">
        {sortedTasks.length === 0 ? (
          <div className="py-12 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-400/50 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-300">Nenhuma tarefa encontrada neste filtro!</p>
            <p className="text-xs text-slate-400">Você está em dia com as suas obrigações acadêmicas.</p>
          </div>
        ) : (
          sortedTasks.map((task) => {
            const isCompleted = task.status === 'completed';
            const { label, isUrgent } = getDaysRemaining(task.dueDate);

            // Special highlighted layout for critical evaluation tasks (08/09 and 10/09)
            if ((task.isCriticalMvp || (task.type === 'avaliacao' && task.priority === 'critica')) && !isCompleted) {
              return (
                <div
                  key={task.id}
                  className="relative overflow-hidden rounded-xl bg-gradient-to-r from-amber-950/25 via-[#161c2d] to-[#121726] border-2 border-amber-500/40 p-4 transition-all hover:border-amber-400/60 shadow-lg shadow-amber-500/5 group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <button
                        onClick={() => updateTaskStatus(task.id, 'completed')}
                        className="mt-0.5 text-amber-400 hover:text-emerald-400 transition-colors shrink-0 cursor-pointer"
                        title="Marcar como Concluída"
                      >
                        <Circle className="w-5 h-5" />
                      </button>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500 text-slate-950 flex items-center gap-1 shadow-sm">
                            <AlertTriangle className="w-3 h-3" />
                            {task.subjectId === 'innovation-lab' ? 'AVALIAÇÃO PARCIAL MVP' : 'AVALIAÇÃO PARCIAL'}
                          </span>
                          <span className="text-[11px] font-semibold text-sky-400 bg-sky-950/60 px-2 py-0.5 rounded border border-sky-800/40">
                            {task.subjectName}
                          </span>
                          {task.scoreWeight && (
                            <span className="text-[10px] font-mono font-medium text-amber-300/90 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-700/30">
                              {task.scoreWeight}
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                          {task.title}
                        </h4>
                        <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                          {task.description}
                        </p>
                      </div>
                    </div>

                    {/* Due Date & Urgency Pill */}
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-xs font-bold shadow-sm">
                        <Calendar className="w-3.5 h-3.5 text-amber-400" />
                        <span>{formatDateBR(task.dueDate)}</span>
                      </div>
                      <span className="text-[10px] font-semibold text-amber-400 font-mono">
                        {label} {task.dueTime ? `às ${task.dueTime}` : ''}
                      </span>
                    </div>
                  </div>
                </div>
              );
            }

            // Standard task card
            return (
              <div
                key={task.id}
                className={`rounded-xl border p-3.5 transition-all flex items-center justify-between gap-3 ${
                  isCompleted
                    ? 'bg-[#0d121d]/50 border-[#182030] opacity-60'
                    : 'bg-[#111726] border-[#1d273d] hover:border-[#2b3a5c]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => updateTaskStatus(task.id, isCompleted ? 'todo' : 'completed')}
                    className={`transition-colors shrink-0 cursor-pointer ${
                      isCompleted ? 'text-emerald-400' : 'text-slate-500 hover:text-emerald-400'
                    }`}
                    title={isCompleted ? 'Desmarcar' : 'Concluir Tarefa'}
                  >
                    {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                  </button>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[10px] font-semibold text-sky-400 bg-sky-950/40 px-1.5 py-0.5 rounded border border-sky-800/30">
                        {task.subjectName}
                      </span>
                      {(() => {
                        const tBadge = getTaskTypeBadge(task.type);
                        const pBadge = getPriorityBadge(task.priority);
                        return (
                          <>
                            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${tBadge.bg} ${tBadge.color} ${tBadge.border}`}>
                              {tBadge.label}
                            </span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${pBadge.bg} ${pBadge.color} ${pBadge.border}`}>
                              {pBadge.label}
                            </span>
                          </>
                        );
                      })()}
                    </div>
                    <h4 className={`text-xs font-semibold truncate ${isCompleted ? 'line-through text-slate-400' : 'text-white'}`}>
                      {task.title}
                    </h4>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <span className="text-xs font-mono text-slate-300 font-medium block">
                      {formatDateBR(task.dueDate)}
                    </span>
                    <span className={`text-[10px] ${isUrgent && !isCompleted ? 'text-amber-400 font-bold' : 'text-slate-400'}`}>
                      {label}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer navigation */}
      <div className="mt-5 pt-3 border-t border-[#1c2438] flex items-center justify-between">
        <span className="text-xs text-slate-400">
          Mostrando {sortedTasks.length} de {tasks.length} itens no planner
        </span>

        <button
          onClick={() => setActiveTab('tarefas')}
          className="text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
        >
          <span>Gerenciar Todas no Kanban</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
