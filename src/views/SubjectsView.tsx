import React, { useState } from 'react';
import { BookOpen, Plus, X } from 'lucide-react';
import { usePlanner } from '../context/PlannerContext';

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
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Disciplinas & Ementas Acadêmicas</h1>
            <p className="text-slate-400 text-sm mt-0.5">
              Conteúdo programático, módulos, tópicos ministrados e acervo de materiais de estudo da Faculdade Impacta
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Selecione a Disciplina</span>
            <button
              onClick={() => setIsModalOpen(true)}
              className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Nova Disciplina
            </button>
          </div>

          {subjects.map((sub) => (
            <div
              key={sub.id}
              onClick={() => setSelectedSubject(sub)}
              className={`p-5 rounded-2xl cursor-pointer transition-all ${
                activeSubject?.id === sub.id
                  ? 'bg-slate-800 shadow-lg ring-1 ring-blue-500/40'
                  : 'bg-slate-800/50 hover:bg-slate-800/80 shadow-md'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900/60 text-blue-400">{sub.code}</span>
                <span className="text-xs font-semibold text-blue-400">{sub.progress}%</span>
              </div>
              <h3 className="text-sm font-bold text-white">{sub.name}</h3>
              <p className="text-xs text-slate-400 mt-1">{getProfessorLabel(sub)}</p>
              <div className="w-full bg-slate-900/60 h-1.5 rounded-full mt-3.5 overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full" style={{ width: `${sub.progress}%` }}></div>
              </div>
            </div>
          ))}
        </div>

        {activeSubject && (
          <div className="lg:col-span-2 space-y-6">
            <div className="p-7 bg-slate-800/50 rounded-2xl shadow-lg">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-blue-500/10 text-blue-400">{activeSubject.code}</span>
                <span className="text-xs text-slate-400">Faculdade Impacta Tecnologia</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">{activeSubject.name}</h2>
              <p className="text-sm text-slate-400">{getProfessorLabel(activeSubject)}</p>
              {activeSubject.description && (
                <p className="text-xs text-slate-300 mt-4 leading-relaxed">{activeSubject.description}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl w-full max-w-md p-7 shadow-2xl relative">
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
                  className="w-full bg-slate-800/70 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
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
                  className="w-full bg-slate-800/70 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Professor Responsável</label>
                <input
                  type="text"
                  placeholder="Ex: Prof. Fábio Nogueira"
                  value={newProf}
                  onChange={(e) => setNewProf(e.target.value)}
                  className="w-full bg-slate-800/70 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-white bg-slate-800/70 hover:bg-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-950 bg-amber-500 hover:bg-amber-400 shadow-md cursor-pointer"
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
