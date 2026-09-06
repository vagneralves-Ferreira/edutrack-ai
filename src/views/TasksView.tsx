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
  Trash2
} from 'lucide-react';
import { formatDateBR, getDaysRemaining, getTaskTypeBadge, getPriorityBadge } from '../utils/helpers';

export const TasksView: React.FC = () => {
  const { tasks, subjects, updateTaskStatus, deleteTask, setIsNewTaskModalOpen } = usePlanner();

  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [onlyMvp, setOnlyMvp] = useState<boolean>(false);

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

  const columns: { id: TaskStatus; label: string; count: number; color: string; dotColor: string }[] = [
    { 
      id: 'todo', 
      label: 'A Fazer', 
      count: filteredTasks.filter(t => t.status === 'todo').length, 
      color: 'border-slate-700 bg-[#0d121e]',
      dotColor: 'bg-slate-400'
    },
    { 
      id: 'in_progress', 
      label: 'Em Andamento', 
      count: filteredTasks.filter(t => t.status === 'in_progress').length, 
      color: 'border-amber-500/30 bg-[#111726]',
      dotColor: 'bg-amber-400'
    },
    { 
      id: 'completed', 
      label: 'Concluídas', 
      count: filteredTasks.filter(t => t.status === 'completed').length, 
      color: 'border-emerald-500/30 bg-[#0d1720]',
      dotColor: 'bg-emerald-400'
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight font-sans">
                Gestão de Tarefas & Prazos
              </h2>
              <p className="text-xs text-slate-400">
                Organize suas entregas, exercícios, Avaliações Parciais e o MVP de Innovation Lab
              </p>
            </div>
          </div>
        </div>

        {/* View Switcher & Add Button */}
        <div className="flex items-center gap-3">
          <div className="flex p-1 rounded-xl bg-[#141b2c] border border-[#232f4a] text-xs">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                viewMode === 'kanban' ? 'bg-[#1e273d] text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Kanban className="w-3.5 h-3.5" />
              <span>Quadro Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                viewMode === 'list' ? 'bg-[#1e273d] text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Lista Detalhada</span>
            </button>
          </div>

          <button
            onClick={() => setIsNewTaskModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/15 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Tarefa</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-[#0f1422] border border-[#1e273d] flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar tarefas, tags, professores..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#141b2c] border border-[#232f4a] text-white text-xs placeholder-slate-400 focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Subject Filter */}
          <select
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#141b2c] border border-[#232f4a] text-slate-200 text-xs focus:outline-none focus:border-amber-400 cursor-pointer"
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
            className="px-3 py-2 rounded-xl bg-[#141b2c] border border-[#232f4a] text-slate-200 text-xs focus:outline-none focus:border-amber-400 cursor-pointer"
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
            className="px-3 py-2 rounded-xl bg-[#141b2c] border border-[#232f4a] text-slate-200 text-xs focus:outline-none focus:border-amber-400 cursor-pointer"
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
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
            onlyMvp
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
              : 'bg-[#141b2c] text-slate-400 border-[#232f4a] hover:text-slate-200'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          <span>Prazos Críticos (08/09 e 10/09)</span>
        </button>
      </div>

      {/* Content: Kanban or List */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {columns.map((column) => {
            const colTasks = filteredTasks.filter(t => t.status === column.id);

            return (
              <div
                key={column.id}
                className={`rounded-2xl border ${column.color} p-4 flex flex-col min-h-[500px]`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 border-b border-[#1c2438] mb-4">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${column.dotColor}`} />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                      {column.label}
                    </h3>
                  </div>
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-[#172033] text-slate-300 border border-[#232f4a]">
                    {colTasks.length}
                  </span>
                </div>

                {/* Column Task Cards */}
                <div className="space-y-3 flex-1 overflow-y-auto">
                  {colTasks.length === 0 ? (
                    <div className="h-40 flex items-center justify-center text-center text-xs text-slate-400 border border-dashed border-[#1c2438] rounded-xl p-4">
                      Nenhuma tarefa nesta coluna
                    </div>
                  ) : (
                    colTasks.map((task) => {
                      const { label, isUrgent } = getDaysRemaining(task.dueDate);

                      return (
                        <div
                          key={task.id}
                          className={`rounded-xl p-4 transition-all shadow-md group ${
                            task.isCriticalMvp && task.status !== 'completed'
                              ? 'bg-gradient-to-b from-[#181d2c] to-[#121624] border-2 border-amber-500/40'
                              : 'bg-[#131929] border border-[#202a40] hover:border-[#2f3d5c]'
                          }`}
                        >
                          {/* Subject, Category & Priority badges */}
                          <div className="flex items-start justify-between gap-1.5 mb-2 flex-wrap">
                            <span className="text-[10px] font-semibold text-sky-400 bg-sky-950/60 px-2 py-0.5 rounded border border-sky-800/40 truncate">
                              {task.subjectName}
                            </span>

                            <div className="flex items-center gap-1 shrink-0">
                              {(() => {
                                const tBadge = getTaskTypeBadge(task.type);
                                const pBadge = getPriorityBadge(task.priority);
                                return (
                                  <>
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${tBadge.bg} ${tBadge.color} ${tBadge.border}`}>
                                      {task.subjectId === 'innovation-lab' && task.isCriticalMvp ? 'MVP' : tBadge.label}
                                    </span>
                                    {(!task.isCriticalMvp || task.subjectId !== 'innovation-lab') && task.priority !== 'baixa' && (
                                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${pBadge.bg} ${pBadge.color} ${pBadge.border}`}>
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
                          <div className="mt-3 pt-2.5 border-t border-[#1c2438] flex items-center justify-between text-[10px]">
                            <div className="flex items-center gap-1 text-slate-300 font-mono">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>{formatDateBR(task.dueDate)}</span>
                            </div>

                            <span className={`font-semibold ${isUrgent && task.status !== 'completed' ? 'text-amber-400' : 'text-slate-400'}`}>
                              {label}
                            </span>
                          </div>

                          {/* Quick Status Changers */}
                          <div className="mt-3 flex items-center justify-between gap-1 pt-2 border-t border-[#1a2233]">
                            <div className="flex items-center gap-1">
                              {column.id !== 'todo' && (
                                <button
                                  onClick={() => updateTaskStatus(task.id, 'todo')}
                                  className="text-[10px] px-2 py-1 rounded bg-[#182030] hover:bg-[#222c42] text-slate-300 cursor-pointer"
                                  title="Mover para A Fazer"
                                >
                                  &larr; A Fazer
                                </button>
                              )}
                              {column.id !== 'in_progress' && (
                                <button
                                  onClick={() => updateTaskStatus(task.id, 'in_progress')}
                                  className="text-[10px] px-2 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 cursor-pointer"
                                  title="Mover para Em Andamento"
                                >
                                  Em Andamento
                                </button>
                              )}
                              {column.id !== 'completed' && (
                                <button
                                  onClick={() => updateTaskStatus(task.id, 'completed')}
                                  className="text-[10px] px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 cursor-pointer font-medium"
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
        <div className="rounded-2xl bg-[#0f1422] border border-[#1e273d] p-4 shadow-xl space-y-3">
          {filteredTasks.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Nenhuma tarefa corresponde aos filtros selecionados.
            </div>
          ) : (
            filteredTasks.map((task) => {
              const isCompleted = task.status === 'completed';
              const { label, isUrgent } = getDaysRemaining(task.dueDate);

              return (
                <div
                  key={task.id}
                  className={`rounded-xl border p-4 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    task.isCriticalMvp && !isCompleted
                      ? 'bg-gradient-to-r from-amber-950/20 to-[#121828] border-amber-500/40'
                      : isCompleted
                      ? 'bg-[#0d121e]/50 border-[#182030] opacity-70'
                      : 'bg-[#121828] border-[#1f283d] hover:border-[#2f3d5c]'
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
                        <span className="text-[11px] font-semibold text-sky-400">
                          {task.subjectName}
                        </span>
                        {(() => {
                          const tBadge = getTaskTypeBadge(task.type);
                          const pBadge = getPriorityBadge(task.priority);
                          return (
                            <>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${tBadge.bg} ${tBadge.color} ${tBadge.border}`}>
                                {task.subjectId === 'innovation-lab' && task.isCriticalMvp ? 'AVALIAÇÃO PARCIAL MVP' : tBadge.label}
                              </span>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${pBadge.bg} ${pBadge.color} ${pBadge.border}`}>
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

                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-[#1c2438]">
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
                        className="px-2 py-1 rounded bg-[#161d2d] border border-[#232f48] text-[11px] text-slate-200 cursor-pointer"
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
    </div>
  );
};
