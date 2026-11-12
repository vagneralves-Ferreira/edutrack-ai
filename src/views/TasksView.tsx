import React, { useState } from 'react';
import { usePlanner } from '../context/PlannerContext';
import type { TaskStatus } from '../types';
import { 
  CheckSquare, 
  Plus, 
  Search, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  Circle, 
  Kanban, 
  List, 
  Trash2,
  RefreshCw,
  BookMarked
} from 'lucide-react';
import { formatDateBR, getDaysRemaining, getTaskTypeBadge, getPriorityBadge } from '../utils/helpers';
import { AiDica } from '../components/AiDica';

export const TasksView: React.FC = () => {
  const { tasks, subjects, updateTaskStatus, deleteTask, setIsNewTaskModalOpen, importClassroomTasks } = usePlanner();

  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [onlyMvp, setOnlyMvp] = useState<boolean>(false);

  // Google Classroom Sync Mockup States
  const [isSyncingClassroom, setIsSyncingClassroom] = useState(false);
  const [syncStepMessage, setSyncStepMessage] = useState('Autenticando via Google Workspace da Impacta...');
  const [syncSuccessBanner, setSyncSuccessBanner] = useState<string | null>(null);

  const handleSyncClassroom = () => {
    if (isSyncingClassroom) return;
    setSyncSuccessBanner(null);
    setIsSyncingClassroom(true);
    setSyncStepMessage('Autenticando via Google Workspace da Impacta...');

    setTimeout(() => {
      setSyncStepMessage('Importando turmas e atividades pendentes do Google Classroom...');
    }, 1000);

    setTimeout(() => {
      const count = importClassroomTasks();
      setIsSyncingClassroom(false);
      setSyncSuccessBanner(`${count} atividades acadêmicas sincronizadas do Google Classroom!`);
      setTimeout(() => setSyncSuccessBanner(null), 5000);
    }, 2100);
  };

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    if (selectedSubjectId !== 'all' && task.subjectId !== selectedSubjectId) return false;
    if (selectedPriority !== 'all' && task.priority !== selectedPriority) return false;
    if (selectedType !== 'all' && task.type !== selectedType) return false;
    if (onlyMvp && !task.isCriticalMvp && task.type !== 'avaliacao') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return task.title.toLowerCase().includes(q) || task.subjectName.toLowerCase().includes(q) || task.description.toLowerCase().includes(q);
    }
    return true;
  });

  const columns: { id: TaskStatus; label: string; count: number; dotColor: string }[] = [
    { 
      id: 'todo', 
      label: 'A Fazer', 
      count: filteredTasks.filter(t => t.status === 'todo').length, 
      dotColor: 'bg-slate-400'
    },
    { 
      id: 'in_progress', 
      label: 'Em Andamento', 
      count: filteredTasks.filter(t => t.status === 'in_progress').length, 
      dotColor: 'bg-amber-400'
    },
    { 
      id: 'completed', 
      label: 'Concluídas', 
      count: filteredTasks.filter(t => t.status === 'completed').length, 
      dotColor: 'bg-emerald-400'
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight font-sans">
                Gestão de Tarefas & Prazos
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Organize suas entregas, exercícios, Avaliações Parciais e o MVP de Innovation Lab
              </p>
            </div>
          </div>
        </div>

        {/* View Switcher, Classroom Sync & Add Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex p-1 rounded-xl bg-white/[0.03] border border-white/[0.07] text-xs">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                viewMode === 'kanban' ? 'bg-white/[0.1] text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                viewMode === 'list' ? 'bg-white/[0.1] text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Lista</span>
            </button>
          </div>

          {/* Google Classroom Integration Button */}
          <button
            onClick={handleSyncClassroom}
            disabled={isSyncingClassroom}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-100 font-semibold text-xs transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
          >
            <span className="flex items-center justify-center w-4 h-4 rounded bg-emerald-500/20 text-emerald-400">
              <BookMarked className="w-3.5 h-3.5" />
            </span>
            <span>Sincronizar Classroom</span>
            <span className="flex items-center gap-0.5 ml-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
            </span>
          </button>

          <button
            onClick={() => setIsNewTaskModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/15 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Nova Tarefa</span>
          </button>
        </div>
      </div>

      {/* Temporary Success Notification */}
      {syncSuccessBanner && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2.5 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{syncSuccessBanner}</span>
          </div>
          <span className="text-[11px] font-mono text-emerald-400/90">Google Workspace • Impacta</span>
        </div>
      )}

      {/* IA Dica */}
      <AiDica tela="Tarefas & Prazos" contexto={{ total: tasks.length }} />

      {/* Filters Bar */}
      <div className="bento-card p-4 sm:p-5 rounded-2xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar tarefas, disciplinas, descrições..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.07] text-white text-xs placeholder-slate-400 focus:outline-none focus:border-amber-500/50 transition-all"
            />
          </div>

          {/* Subject Filter */}
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#0e1320] border border-white/[0.07] text-slate-200 text-xs focus:outline-none focus:border-amber-500/50 cursor-pointer transition-all"
          >
            <option value="all">Todas as Disciplinas</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#0e1320] border border-white/[0.07] text-slate-200 text-xs focus:outline-none focus:border-amber-500/50 cursor-pointer transition-all"
          >
            <option value="all">Todas as Prioridades</option>
            <option value="critica">🔥 Crítica</option>
            <option value="alta">⚡ Alta</option>
            <option value="media">Média</option>
            <option value="baixa">Baixa</option>
          </select>

          {/* Category / Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#0e1320] border border-white/[0.07] text-slate-200 text-xs focus:outline-none focus:border-amber-500/50 cursor-pointer transition-all"
          >
            <option value="all">Todas as Atividades</option>
            <option value="avaliacao">Avaliação Parcial</option>
            <option value="avaliacao_mvp">⭐ Avaliação Parcial MVP (Innovation Lab)</option>
            <option value="exercicio">Exercício Prático</option>
            <option value="lista">Lista de Exercícios</option>
            <option value="laboratorio">Laboratório</option>
            <option value="leitura">Leitura Complementar</option>
          </select>
        </div>

        {/* Critical Evaluation Filter Toggle */}
        <button
          onClick={() => setOnlyMvp(!onlyMvp)}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
            onlyMvp
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : 'bg-white/[0.03] border-white/[0.07] text-slate-400 hover:text-slate-200'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span>Prazos Críticos</span>
        </button>
      </div>

      {/* Content: Kanban or List */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {columns.map((column) => {
            const colTasks = filteredTasks.filter(t => t.status === column.id);

            return (
              <div
                key={column.id}
                className="bento-card rounded-2xl p-5 flex flex-col min-h-[500px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${column.dotColor}`} />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      {column.label}
                    </h3>
                  </div>
                  <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-slate-300">
                    {colTasks.length}
                  </span>
                </div>

                {/* Column Task Cards */}
                <div className="space-y-3 flex-1 overflow-y-auto">
                  {colTasks.length === 0 ? (
                    <div className="h-40 flex items-center justify-center text-center text-xs text-slate-500 bg-white/[0.015] border border-dashed border-white/[0.06] rounded-xl p-4">
                      Nenhuma tarefa nesta coluna
                    </div>
                  ) : (
                    colTasks.map((task) => {
                      const { label, isUrgent } = getDaysRemaining(task.dueDate);
                      const matchedSubject = subjects.find((s) => s.id === task.subjectId);
                      const subjectColor = matchedSubject?.color || '#38bdf8';
                      const subjectDisplayName = matchedSubject?.name || task.subjectName;

                      return (
                        <div
                          key={task.id}
                          className={`rounded-xl p-4 border transition-all group ${
                            task.isCriticalMvp && task.status !== 'completed'
                              ? 'bg-gradient-to-b from-amber-500/12 to-white/[0.02] border-amber-500/30 hover:border-amber-500/50'
                              : 'bg-white/[0.03] border-white/[0.07] hover:bg-white/[0.05] hover:border-white/[0.14]'
                          }`}
                        >
                          {/* Subject, Category & Priority badges */}
                          <div className="flex items-start justify-between gap-1.5 mb-2.5 flex-wrap">
                            <span
                              className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] truncate"
                              style={{ color: subjectColor }}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: subjectColor }}
                              />
                              {subjectDisplayName}
                            </span>

                            <div className="flex items-center gap-1 shrink-0 flex-wrap">
                              {task.importedFromClassroom && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300">
                                  <BookMarked className="w-2.5 h-2.5 text-emerald-400" />
                                  Classroom
                                </span>
                              )}
                              {(() => {
                                const tBadge = getTaskTypeBadge(task.type);
                                const pBadge = getPriorityBadge(task.priority);
                                return (
                                  <>
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${tBadge.bg} ${tBadge.color}`}>
                                      {task.subjectId === 'innovation-lab' && task.isCriticalMvp ? 'MVP' : tBadge.label}
                                    </span>
                                    {(!task.isCriticalMvp || task.subjectId !== 'innovation-lab') && (
                                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${pBadge.bg} ${pBadge.color}`}>
                                        {pBadge.label}
                                      </span>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          </div>

                          <h4 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors leading-snug">
                            {task.title}
                          </h4>

                          <p className="text-[11px] text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                            {task.description}
                          </p>

                          {/* Due Date & Urgency */}
                          <div className="mt-3 pt-2.5 border-t border-white/[0.05] flex items-center justify-between text-[10px]">
                            <div className="flex items-center gap-1 text-slate-300 font-mono">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>{formatDateBR(task.dueDate)}</span>
                            </div>

                            <span className={`font-semibold ${isUrgent && task.status !== 'completed' ? 'text-amber-400' : 'text-slate-400'}`}>
                              {label}
                            </span>
                          </div>

                          {/* Quick Status Changers */}
                          <div className="mt-2.5 flex items-center justify-between gap-1 pt-1">
                            <div className="flex items-center gap-1">
                              {column.id !== 'todo' && (
                                <button
                                  onClick={() => updateTaskStatus(task.id, 'todo')}
                                  className="text-[10px] px-2 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.09] text-slate-300 cursor-pointer"
                                  title="Mover para A Fazer"
                                >
                                  &larr; A Fazer
                                </button>
                              )}
                              {column.id !== 'in_progress' && (
                                <button
                                  onClick={() => updateTaskStatus(task.id, 'in_progress')}
                                  className="text-[10px] px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 cursor-pointer"
                                  title="Mover para Em Andamento"
                                >
                                  Em Andamento
                                </button>
                              )}
                              {column.id !== 'completed' && (
                                <button
                                  onClick={() => updateTaskStatus(task.id, 'completed')}
                                  className="text-[10px] px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 cursor-pointer font-medium"
                                  title="Marcar como Concluída"
                                >
                                  Concluir &rarr;
                                </button>
                              )}
                            </div>

                            <button
                              onClick={() => deleteTask(task.id)}
                              className="p-1 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                              title="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Detailed List View */
        <div className="bento-card rounded-2xl p-6 space-y-3">
          {filteredTasks.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Nenhuma tarefa corresponde aos filtros selecionados.
            </div>
          ) : (
            filteredTasks.map((task) => {
              const isCompleted = task.status === 'completed';
              const { label, isUrgent } = getDaysRemaining(task.dueDate);
              const matchedSubject = subjects.find((s) => s.id === task.subjectId);
              const subjectColor = matchedSubject?.color || '#38bdf8';
              const subjectDisplayName = matchedSubject?.name || task.subjectName;

              return (
                <div
                  key={task.id}
                  className={`rounded-xl p-4 sm:p-5 border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    task.isCriticalMvp && !isCompleted
                      ? 'bg-gradient-to-r from-amber-500/12 to-white/[0.02] border-amber-500/30'
                      : isCompleted
                      ? 'bg-white/[0.01] border-white/[0.04] opacity-60'
                      : 'bg-white/[0.03] border-white/[0.07] hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      onClick={() => updateTaskStatus(task.id, isCompleted ? 'todo' : 'completed')}
                      className={`mt-0.5 transition-colors shrink-0 cursor-pointer ${
                        isCompleted ? 'text-emerald-400' : 'text-slate-500 hover:text-emerald-400'
                      }`}
                    >
                      {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                    </button>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span
                          className="inline-flex items-center gap-1.5 text-[11px] font-semibold"
                          style={{ color: subjectColor }}
                        >
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: subjectColor }}
                          />
                          {subjectDisplayName}
                        </span>
                        {task.importedFromClassroom && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300">
                            <BookMarked className="w-2.5 h-2.5 text-emerald-400" />
                            Classroom
                          </span>
                        )}
                        {(() => {
                          const tBadge = getTaskTypeBadge(task.type);
                          const pBadge = getPriorityBadge(task.priority);
                          return (
                            <>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${tBadge.bg} ${tBadge.color}`}>
                                {task.subjectId === 'innovation-lab' && task.isCriticalMvp ? 'AVALIAÇÃO PARCIAL MVP' : tBadge.label}
                              </span>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${pBadge.bg} ${pBadge.color}`}>
                                Prioridade: {pBadge.label}
                              </span>
                            </>
                          );
                        })()}
                      </div>

                      <h4 className={`text-sm font-bold ${isCompleted ? 'line-through text-slate-400' : 'text-white'}`}>
                        {task.title}
                      </h4>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        {task.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 pt-2 sm:pt-0">
                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-white block">
                        {formatDateBR(task.dueDate)} {task.dueTime ? `(${task.dueTime})` : ''}
                      </span>
                      <span className={`text-[10px] font-semibold ${isUrgent && !isCompleted ? 'text-amber-400' : 'text-slate-400'}`}>
                        {label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={task.status}
                        onChange={(e) => updateTaskStatus(task.id, e.target.value as TaskStatus)}
                        className="px-2.5 py-1.5 rounded-lg bg-[#0e1320] border border-white/[0.08] text-[11px] text-slate-200 focus:outline-none focus:border-amber-500/50 cursor-pointer"
                      >
                        <option value="todo">A Fazer</option>
                        <option value="in_progress">Em Andamento</option>
                        <option value="completed">Concluída</option>
                      </select>

                      <button
                        onClick={() => deleteTask(task.id)}
                        className="p-1 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                        title="Excluir tarefa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

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
                Conectado ao domínio institucional <span className="text-amber-400 font-mono">@impacta.edu.br</span>
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
