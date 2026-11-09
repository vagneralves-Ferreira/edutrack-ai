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
  const { tasks, updateTaskStatus, setActiveTab, setIsNewTaskModalOpen, importClassroomTasks } = usePlanner();
  const [filter, setFilter] = useState<'all' | 'mvp' | 'pending'>('all');
  const [isSyncingClassroom, setIsSyncingClassroom] = useState(false);
  const [syncStepMessage, setSyncStepMessage] = useState('Autenticando via Google Workspace da Impacta...');

  const handleSyncClassroom = () => {
    if (isSyncingClassroom) return;
    setIsSyncingClassroom(true);
    setSyncStepMessage('Autenticando via Google Workspace da Impacta...');

    setTimeout(() => {
      setSyncStepMessage('Importando turmas e atividades pendentes do Google Classroom...');
    }, 1000);

    setTimeout(() => {
      importClassroomTasks();
      setIsSyncingClassroom(false);
    }, 2100);
  };

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    if (filter === 'mvp') return (task.isCriticalMvp || task.subjectId === 'innovation-lab') && task.status !== 'completed';
    if (filter === 'pending') return task.status !== 'completed';
    return true;
  });

  // Sort tasks by due date (critical evaluations and Classroom imports first)
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const isCritA = a.isCriticalMvp || a.priority === 'critica';
    const isCritB = b.isCriticalMvp || b.priority === 'critica';
    if (isCritA && !isCritB) return -1;
    if (!isCritA && isCritB) return 1;
    return a.dueDate.localeCompare(b.dueDate);
  });

  const criticalMvpCount = tasks.filter(t => (t.isCriticalMvp || t.subjectId === 'innovation-lab') && t.status !== 'completed').length;

  return (
    <div className="rounded-2xl bg-slate-800/50 p-7 shadow-lg h-full flex flex-col justify-between">
      <div>
        {/* Header with Title and Filter Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2 flex-wrap">
                  Tarefas Próximas & Prazos Críticos
                  {criticalMvpCount > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 animate-pulse">
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

          {/* Filter & Classroom Sync controls */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleSyncClassroom}
              disabled={isSyncingClassroom}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/70 hover:bg-slate-900 text-emerald-300 text-xs font-semibold transition-all cursor-pointer shadow-sm"
              title="Sincronizar com Google Classroom"
            >
              <BookMarked className="w-3.5 h-3.5 text-emerald-400" />
              <span>Sincronizar Classroom</span>
            </button>

            <div className="flex p-1 rounded-xl bg-slate-900/60 text-xs">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  filter === 'all' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Todas ({tasks.length})
              </button>
              <button
                onClick={() => setFilter('mvp')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  filter === 'mvp' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                ⭐ MVP
              </button>
              <button
                onClick={() => setFilter('pending')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  filter === 'pending' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Pendentes
              </button>
            </div>

            <button
              onClick={() => setIsNewTaskModalOpen(true)}
              className="p-2 rounded-xl bg-slate-900/60 hover:bg-slate-800 text-amber-400 hover:text-amber-300 transition-colors cursor-pointer shadow-sm"
              title="Nova Tarefa"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Task List */}
        <div className="mt-4 space-y-3.5">
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
                    className="relative overflow-hidden rounded-xl bg-gradient-to-r from-amber-500/15 via-slate-800/80 to-slate-800/60 p-4.5 transition-all hover:bg-slate-800 shadow-md group"
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
                            <span className="text-[11px] font-semibold text-sky-400 bg-sky-950/60 px-2 py-0.5 rounded">
                              {task.subjectName}
                            </span>
                            {task.importedFromClassroom && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300">
                                <BookMarked className="w-2.5 h-2.5 text-emerald-400" />
                                Importado do Classroom
                              </span>
                            )}
                            {task.scoreWeight && (
                              <span className="text-[10px] font-mono font-medium text-amber-300/90 bg-amber-950/40 px-2 py-0.5 rounded">
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
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-mono text-xs font-bold shadow-sm">
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
                  className={`rounded-xl p-4 transition-all flex items-center justify-between gap-3 shadow-md ${
                    isCompleted
                      ? 'bg-slate-800/30 opacity-60'
                      : 'bg-slate-800/60 hover:bg-slate-800/90'
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
                        <span className="text-[10px] font-semibold text-sky-400 bg-sky-950/40 px-1.5 py-0.5 rounded">
                          {task.subjectName}
                        </span>
                        {task.importedFromClassroom && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300">
                            <BookMarked className="w-2.5 h-2.5 text-emerald-400" />
                            Importado do Classroom
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
      </div>

      {/* Footer navigation */}
      <div className="mt-6 pt-3 flex items-center justify-between">
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

      {/* High-Fidelity Google Classroom OAuth / Sync Modal */}
      {isSyncingClassroom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 p-7 shadow-2xl text-center space-y-5">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-500/15 flex items-center justify-center text-emerald-400 shadow-inner">
              <RefreshCw className="w-7 h-7 animate-spin" />
            </div>

            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 text-[11px] font-semibold text-slate-300">
                <span className="w-2 h-2 rounded-full bg-[#34A853]" />
                <span>Google Classroom • OAuth 2.0</span>
              </div>
              <h3 className="text-base font-bold text-white pt-1">
                {syncStepMessage}
              </h3>
              <p className="text-xs text-slate-400">
                Conectado ao domínio institucional <span className="text-amber-400 font-mono">@impacta.edu.br</span>
              </p>
            </div>

            <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-[#4285F4] via-[#34A853] to-[#FBBC05] animate-pulse" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
