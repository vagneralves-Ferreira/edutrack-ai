import React, { useState } from 'react';
import { BookOpen, Plus, X, User, Clock, CheckCircle2 } from 'lucide-react';
import { usePlanner } from '../context/PlannerContext';
import { AiDica } from '../components/AiDica';

export const SubjectsView: React.FC = () => {
  const { subjects, selectedSubject, setSelectedSubject, addSubject } = usePlanner();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newProf, setNewProf] = useState('');

  const activeSubject = selectedSubject || subjects[0];

  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newCode.trim()) return;

    addSubject({
      code: newCode.trim(),
      name: newName.trim(),
      professor: newProf.trim() || 'Prof. Responsável',
    });

    setNewCode('');
    setNewName('');
    setNewProf('');
    setIsModalOpen(false);
  };

  const getProfessorLabel = (sub: any) => {
    if (Array.isArray(sub.professors) && sub.professors.length > 0) {
      return sub.professors.join(', ');
    }
    return sub.professor || 'Prof. Responsável';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl text-sky-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Disciplinas & Ementas Acadêmicas</h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
              Conteúdo programático, tópicos ministrados e materiais de estudo da Faculdade Impacta
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/15 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Nova Disciplina</span>
        </button>
      </div>

      <AiDica
        tela="Disciplinas"
        contexto={{
          totalDisciplinas: subjects.length,
          disciplinaSelecionada: activeSubject?.name,
        }}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-3">
          <div className="flex justify-between items-center px-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Grade Semestral ({subjects.length})</span>
          </div>

          {subjects.map((sub) => {
            const isSelected = activeSubject?.id === sub.id;
            return (
              <div
                key={sub.id}
                onClick={() => setSelectedSubject(sub)}
                className={`p-4 rounded-2xl cursor-pointer transition-all border ${
                  isSelected
                    ? 'bento-card border-sky-500/40 ring-1 ring-sky-500/25'
                    : 'bento-card-interactive'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.07] text-sky-400">{sub.code}</span>
                  <span className="text-xs font-mono font-bold text-sky-400">{sub.progress}%</span>
                </div>
                <h3 className="text-sm font-bold text-white">{sub.name}</h3>
                <p className="text-xs text-slate-400 mt-1">{getProfessorLabel(sub)}</p>
                <div className="w-full bg-white/[0.06] h-1.5 rounded-full mt-3 overflow-hidden">
                  <div className="bg-gradient-to-r from-sky-500 to-indigo-500 h-full rounded-full transition-all" style={{ width: `${sub.progress}%` }}></div>
                </div>
              </div>
            );
          })}
        </div>

        {activeSubject && (
          <div className="lg:col-span-8 space-y-5">
            <div className="p-6 sm:p-7 bento-card rounded-2xl">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400">{activeSubject.code}</span>
                  <span className="text-xs text-slate-400">Faculdade Impacta Tecnologia</span>
                </div>
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                  {activeSubject.progress}% Concluído
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">{activeSubject.name}</h2>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 mt-2">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-sky-400" />
                  {getProfessorLabel(activeSubject)}
                </span>
                {activeSubject.nextClass && (
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    {activeSubject.nextClass}
                  </span>
                )}
              </div>

              {activeSubject.description && (
                <p className="text-xs sm:text-sm text-slate-300/90 mt-4 pt-4 border-t border-white/[0.06] leading-relaxed">
                  {activeSubject.description}
                </p>
              )}

              {Array.isArray(activeSubject.topics) && activeSubject.topics.length > 0 && (
                <div className="mt-6 pt-5 border-t border-white/[0.06]">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Tópicos da Ementa
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {activeSubject.topics.map((topic: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/[0.025] border border-white/[0.05] text-xs text-slate-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <span className="truncate">{topic}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bento-card rounded-2xl w-full max-w-md p-7 shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-white mb-5">Cadastrar Nova Disciplina</h3>
            <form onSubmit={handleAddSubject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Código / Sigla</label>
                <input
                  type="text"
                  placeholder="Ex: IMP-ENG301"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  required
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Nome da Disciplina</label>
                <input
                  type="text"
                  placeholder="Ex: Engenharia de Software II"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Professor Responsável</label>
                <input
                  type="text"
                  placeholder="Ex: Prof. Fábio Nogueira"
                  value={newProf}
                  onChange={(e) => setNewProf(e.target.value)}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition-all"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.07] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 shadow-md cursor-pointer"
                >
                  Salvar Disciplina
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
