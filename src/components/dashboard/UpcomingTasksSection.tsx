import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Circle, 
  Calendar, 
  AlertTriangle, 
  Flame, 
  ArrowRight,
  Plus,
  BookMarked,
  RefreshCw
} from 'lucide-react';
import { usePlanner } from '../../context/PlannerContext';
import { formatDateBR, getDaysRemaining, getTaskTypeBadge, getPriorityBadge } from '../../utils/helpers';

export const UpcomingTasksSection: React.FC = () => {
  const { tasks, updateTaskStatus, setActiveTab, setIsNewTaskModalOpen, setIsClassroomModalOpen } = usePlanner();
  const [filter, setFilter] = useState<'all' | 'mvp' | 'pending'>('all');
  const [isSyncingClassroom] = useState(false);
  const [syncStepMessage] = useState('Conectando ao seu Google Classroom...');

  const handleSyncClassroom = () => {
    setIsClassroomModalOpen(true);
  };

  const filteredTasks = tasks.filter((task) => {
    if (filter === 'mvp') return (task.isCriticalMvp || task.subjectId === 'innovation-lab') && task.status !== 'completed';
    if (filter === 'pending') return task.status !== 'completed';
    return true;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const isCritA = a.isCriticalMvp || a.priority === 'critica';
    const isCritB = b.isCriticalMvp || b.priority === 'critica';
    if (isCritA && !isCritB) return -1;
    if (!isCritA && isCritB) return 1;
    return a.dueDate.localeCompare(b.dueDate);
  });

  const criticalMvpCount = tasks.filter(t => (t.isCriticalMvp || t.subjectId === 'innovation-lab') && t.status !== 'completed').length;

  return (
    <div className="bento-card rounded-3xl p-6 h-full flex flex-col justify-between">
      <div>
        {/* Header with Title and Filter Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/25 text-rose-400">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2 flex-wrap">
                Radar de Entregas & Prazos Críticos
                {criticalMvpCount > 0 && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/35">
                    {criticalMvpCount} MVP
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                Prioridades acadêmicas, avaliações parciais e entregas do semestre
              </p>
            </div>
          </div>

          {/* Filter & Classroom Sync controls */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleSyncClassroom}
              disabled={isSyncingClassroom}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition-all cursor-pointer"
              title="Sincronizar com Google Classroom"
            >
              <BookMarked className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Classroom</span>
            </button>

            <div className="flex p-1 rounded-xl bg-black/40 border border-white/[0.07] text-xs">
              <button
                onClick={() => setFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                  filter === 'all' ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Todas ({tasks.length})
              </button>
              <button
                onClick={() => setFilter('mvp')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                  filter === 'mvp' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                ⭐ MVP
              </button>
              <button
                onClick={() => setFilter('pending')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                  filter === 'pending' ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Pendentes
              </button>
            </div>

            <button
              onClick={() => setIsNewTaskModalOpen(true)}
              className="p-2 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-cyan-300 transition-colors cursor-pointer"
              title="Nova Tarefa"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Task List */}
        <div className="mt-4 space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
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

              if ((task.isCriticalMvp || (task.type === 'avaliacao' && task.priority === 'critica')) && !isCompleted) {
                return (
                  <div
                    key={task.id}
                    className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600/15 via-fuchsia-600/10 to-white/[0.02] border border-violet-500/35 p-4 transition-all hover:border-cyan-400/50 group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <button
                          onClick={() => updateTaskStatus(task.id, 'completed')}
                          className="mt-0.5 text-violet-400 hover:text-emerald-400 transition-colors shrink-0 cursor-pointer"
                          title="Marcar como Concluída"
                        >
                          <Circle className="w-4 h-4" />
                        </button>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white flex items-center gap-1">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              {task.subjectId === 'innovation-lab' ? 'AVALIAÇÃO PARCIAL MVP' : 'AVALIAÇÃO PARCIAL'}
                            </span>
                            <span className="text-[10px] font-semibold text-cyan-300 bg-cyan-500/15 border border-cyan-500/25 px-2 py-0.5 rounded-md">
                              {task.subjectName}
                            </span>
                            {task.importedFromClassroom && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300">
                                <BookMarked className="w-2.5 h-2.5 text-emerald-400" />
                                Classroom
                              </span>
                            )}
                          </div>

                          <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                            {task.title}
                          </h4>
                          <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                            {task.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-violet-500/20 border border-violet-500/35 text-violet-200 font-mono text-[11px] font-bold">
                          <Calendar className="w-3 h-3 text-cyan-400" />
                          <span>{formatDateBR(task.dueDate)}</span>
                        </div>
                        <span className="text-[10px] font-semibold text-rose-400 font-mono">
                          {label}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={task.id}
                  className={`rounded-2xl p-3.5 border transition-all flex items-center justify-between gap-3 ${
                    isCompleted
                      ? 'bg-white/[0.01] border-white/[0.04] opacity-55'
                      : 'bg-white/[0.025] border-white/[0.07] hover:bg-white/[0.05] hover:border-violet-500/30'
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
                      {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span className="text-[10px] font-semibold text-cyan-300 bg-cyan-500/10 px-1.5 py-0.5 rounded">
                          {task.subjectName}
                        </span>
                        {task.importedFromClassroom && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300">
                            <BookMarked className="w-2.5 h-2.5 text-emerald-400" />
                            Classroom
                          </span>
                        )}
                        {(() => {
                          const tBadge = getTaskTypeBadge(task.type);
                          const pBadge = getPriorityBadge(task.priority);
                          return (
                            <>
                              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${tBadge.bg} ${tBadge.color}`}>
                                {tBadge.label}
                              </span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${pBadge.bg} ${pBadge.color}`}>
                                {pBadge.label}
                              </span>
                            </>
                          );
                        })()}
                      </div>
                      <h4 className={`text-xs font-semibold truncate ${isCompleted ? 'line-through text-slate-400' : 'text-slate-100'}`}>
                        {task.title}
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className="text-xs font-mono text-slate-300 font-medium block">
                        {formatDateBR(task.dueDate)}
                      </span>
                      <span className={`text-[10px] ${isUrgent && !isCompleted ? 'text-rose-400 font-bold' : 'text-slate-400'}`}>
                        {label}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Footer navigation */}
      <div className="mt-5 pt-3 border-t border-white/[0.06] flex items-center justify-between">
        <span className="text-xs text-slate-400">
          Exibindo {sortedTasks.length} de {tasks.length} tarefas
        </span>

        <button
          onClick={() => setActiveTab('tarefas')}
          className="text-xs font-bold text-cyan-400 hover:text-violet-300 transition-colors flex items-center gap-1 cursor-pointer"
        >
          <span>Abrir quadro Kanban</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* High-Fidelity Google Classroom OAuth / Sync Modal */}
      {isSyncingClassroom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bento-card p-7 shadow-2xl text-center space-y-5">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-500/15 flex items-center justify-center text-emerald-400 shadow-inner">
              <RefreshCw className="w-7 h-7 animate-spin" />
            </div>

            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.06] text-[11px] font-semibold text-slate-300">
                <span className="w-2 h-2 rounded-full bg-[#34A853]" />
                <span>Google Classroom • OAuth 2.0</span>
              </div>
              <h3 className="text-base font-bold text-white pt-1">
                {syncStepMessage}
              </h3>
              <p className="text-xs text-slate-400">
                Integração com <span className="text-cyan-400 font-mono">Google Classroom & Portais</span>
              </p>
            </div>

            <div className="w-full h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
              <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-[#4285F4] via-[#34A853] to-[#FBBC05] animate-pulse" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
