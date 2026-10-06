import React, { useState } from 'react';
import { BookOpen, Plus, X } from 'lucide-react';

export const SubjectsView: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [subjects, setSubjects] = useState([
    { id: '1', code: 'IMP-SQL101', name: 'SQL Fundamentals', professor: 'Prof. Evandro', progress: 78 },
    { id: '2', code: 'IMP-ENG201', name: 'Software Engineering', professor: 'Prof. Fábio Nogueira', progress: 65 },
    { id: '3', code: 'IMP-ALG102', name: 'Programming & Algorithms', professor: 'Prof. Odair, Prof. João Roberto', progress: 84 },
    { id: '4', code: 'IMP-DBD202', name: 'Database Design', professor: 'Prof. Evandro / Colegiado de Dados', progress: 52 },
    { id: '5', code: 'IMP-INN303', name: 'Innovation Lab: Advanced No/Low Code', professor: 'Prof. Fábio e Mentores de Inovação', progress: 90 },
  ]);
  const [selectedSubject, setSelectedSubject] = useState(subjects[0]);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newProf, setNewProf] = useState('');

  const handleAddSubject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newCode) return;
    const newSub = {
      id: Date.now().toString(),
      code: newCode,
      name: newName,
      professor: newProf || 'Prof. Responsável',
      progress: 0,
    };
    setSubjects([...subjects, newSub]);
    setSelectedSubject(newSub);
    setNewCode('');
    setNewName('');
    setNewProf('');
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-5">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400 border border-blue-500/20">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Disciplinas & Ementas Acadêmicas</h1>
            <p className="text-slate-400 text-sm">Conteúdo programático, módulos, tópicos ministrados e acervo de materiais de estudo da Faculdade Impacta</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Selecione a Disciplina</span>
            <button
              onClick={() => setIsModalOpen(true)}
              className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Nova Disciplina
            </button>
          </div>

          {subjects.map((sub) => (
            <div
              key={sub.id}
              onClick={() => setSelectedSubject(sub)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                selectedSubject.id === sub.id
                  ? 'bg-slate-800/80 border-blue-500/50 shadow-lg shadow-blue-500/5'
                  : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-blue-400 border border-slate-700">{sub.code}</span>
                <span className="text-xs font-semibold text-blue-400">{sub.progress}%</span>
              </div>
              <h3 className="text-sm font-bold text-white">{sub.name}</h3>
              <p className="text-xs text-slate-400 mt-1">{sub.professor}</p>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full" style={{ width: `${sub.progress}%` }}></div>
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 bg-slate-900/50 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">{selectedSubject.code}</span>
              <span className="text-xs text-slate-400">Faculdade Impacta Tecnologia</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">{selectedSubject.name}</h2>
            <p className="text-sm text-slate-400">{selectedSubject.professor}</p>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-white mb-4">Cadastrar Nova Disciplina</h3>
            <form onSubmit={handleAddSubject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Código / Sigla</label>
                <input
                  type="text"
                  placeholder="Ex: IMP-ENG301"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nome da Disciplina</label>
                <input
                  type="text"
                  placeholder="Ex: Engenharia de Software II"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Professor Responsável</label>
                <input
                  type="text"
                  placeholder="Ex: Prof. Fábio Nogueira"
                  value={newProf}
                  onChange={(e) => setNewProf(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-amber-500 hover:bg-amber-600"
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