import React, { useState } from 'react';
import { X, Sparkles, Check, AlertTriangle } from 'lucide-react';
import { usePlanner } from '../../context/PlannerContext';
import type { Priority, TaskType } from '../../types';

export const NewTaskModal: React.FC = () => {
  const { isNewTaskModalOpen, setIsNewTaskModalOpen, subjects, addTask } = usePlanner();

  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || 'sql-fundamentals');
  const [dueDate, setDueDate] = useState('2026-09-08');
  const [dueTime, setDueTime] = useState('23:59');
  const [priority, setPriority] = useState<Priority>('alta');
  const [type, setType] = useState<TaskType>('exercicio');
  const [isCriticalMvp, setIsCriticalMvp] = useState(false);
  const [scoreWeight, setScoreWeight] = useState('Peso 40%');
  const [description, setDescription] = useState('');

  if (!isNewTaskModalOpen) return null;

  const handleMvpToggle = (checked: boolean) => {
    setIsCriticalMvp(checked);
    if (checked) {
      setType('avaliacao_mvp');
      setPriority('critica');
    } else {
      setType('exercicio');
      setPriority('alta');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const selectedSubject = subjects.find(s => s.id === subjectId);

    addTask({
      title: title.trim(),
      subjectId,
      subjectName: selectedSubject ? selectedSubject.name : 'Disciplina',
      dueDate,
      dueTime,
      priority,
      status: 'todo',
      type,
      isCriticalMvp,
      scoreWeight: isCriticalMvp ? scoreWeight : undefined,
      description: description.trim() || 'Sem descrição adicional.',
    });

    // Reset and close
    setTitle('');
    setDescription('');
    setIsCriticalMvp(false);
    setType('exercicio');
    setIsNewTaskModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-2xl bg-[#0e1320] border border-[#232e47] shadow-2xl p-6 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#1c2438]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Nova Tarefa ou Atividade Acadêmica
              </h3>
              <p className="text-xs text-slate-400">
                Cadastre exercícios, leituras, laboratórios ou avaliações
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsNewTaskModalOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#182030] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Título da Atividade *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Exercício Prático: Junções e Agrupamentos em SQL"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#141a29] border border-[#232f48] text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Disciplina da Impacta *
              </label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#141a29] border border-[#232f48] text-white text-xs focus:outline-none focus:border-amber-400 cursor-pointer"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id} className="bg-[#141a29] text-white">
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Tipo de Atividade *
              </label>
              <select
                value={type}
                onChange={(e) => {
                  const newType = e.target.value as TaskType;
                  setType(newType);
                  if (newType === 'avaliacao_mvp') {
                    setIsCriticalMvp(true);
                    setPriority('critica');
                  } else {
                    setIsCriticalMvp(false);
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#141a29] border border-[#232f48] text-white text-xs focus:outline-none focus:border-amber-400 cursor-pointer"
              >
                <option value="exercicio" className="bg-[#141a29]">Exercício Prático</option>
                <option value="lista" className="bg-[#141a29]">Lista de Exercícios</option>
                <option value="laboratorio" className="bg-[#141a29]">Laboratório</option>
                <option value="leitura" className="bg-[#141a29]">Leitura Complementar</option>
                <option value="projeto" className="bg-[#141a29]">Projeto Integrador</option>
                <option value="avaliacao" className="bg-[#141a29]">Avaliação Parcial</option>
                <option value="avaliacao_mvp" className="bg-[#141a29]">⭐ Avaliação Parcial MVP (Innovation Lab)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Prioridade
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#141a29] border border-[#232f48] text-white text-xs focus:outline-none focus:border-amber-400 cursor-pointer"
              >
                <option value="critica" className="bg-[#141a29]">🔥 Crítica (Urgente)</option>
                <option value="alta" className="bg-[#141a29]">⚡ Alta</option>
                <option value="media" className="bg-[#141a29]">Média</option>
                <option value="baixa" className="bg-[#141a29]">Baixa</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Data de Entrega *
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#141a29] border border-[#232f48] text-white text-xs focus:outline-none focus:border-amber-400 font-mono"
              />
            </div>
          </div>

          {/* MVP Checkbox */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isCriticalMvp}
                onChange={(e) => handleMvpToggle(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 bg-slate-900 border-slate-700"
              />
              <div className="text-xs">
                <span className="font-bold text-amber-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Marcar como Avaliação Parcial MVP (Innovation Lab)
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Aplica o destaque oficial com selo MVP para a disciplina Innovation Lab.
                </span>
              </div>
            </label>

            {isCriticalMvp && (
              <div className="mt-3 pt-2 border-t border-amber-500/20">
                <label className="block text-[11px] font-semibold text-amber-300/90 mb-1">
                  Peso na Média / Nota
                </label>
                <input
                  type="text"
                  value={scoreWeight}
                  onChange={(e) => setScoreWeight(e.target.value)}
                  placeholder="Ex: Peso 40% na Média"
                  className="w-full px-3 py-1.5 rounded-lg bg-[#141a29] border border-[#2a3754] text-white text-xs focus:outline-none"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Descrição / Orientações do Professor
            </label>
            <textarea
              rows={3}
              placeholder="Critérios, instruções do Teams, páginas do livro ou requisitos..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-[#141a29] border border-[#232f48] text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-[#1c2438] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsNewTaskModalOpen(false)}
              className="px-4 py-2.5 rounded-xl bg-[#141a29] hover:bg-[#1a2336] text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Salvar Atividade</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
