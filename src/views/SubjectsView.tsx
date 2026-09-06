import React, { useState } from 'react';
import { usePlanner } from '../context/PlannerContext';
import { 
  BookOpen, 
  User, 
  Clock, 
  Layers, 
  FileText, 
  Bookmark, 
  Code2, 
  CheckCircle2,
  ExternalLink,
  Timer,
  Library
} from 'lucide-react';

export const SubjectsView: React.FC = () => {
  const { subjects, setActiveTab } = usePlanner();
  const [activeSubjectId, setActiveSubjectId] = useState<string>(subjects[0]?.id || 'sql-fundamentals');

  const currentSubject = subjects.find(s => s.id === activeSubjectId) || subjects[0];

  const getMaterialIcon = (category: string) => {
    switch (category) {
      case 'apostila':
        return <FileText className="w-4 h-4 text-sky-400" />;
      case 'livro':
        return <Library className="w-4 h-4 text-amber-400" />;
      case 'laboratorio':
        return <Code2 className="w-4 h-4 text-emerald-400" />;
      case 'cheatsheet':
      default:
        return <Bookmark className="w-4 h-4 text-indigo-400" />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#1c2438]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight font-sans">
              Disciplinas & Ementas Acadêmicas
            </h2>
            <p className="text-xs text-slate-400">
              Conteúdo programático, módulos, tópicos ministrados e acervo de materiais de estudo da Faculdade Impacta
            </p>
          </div>
        </div>

        <button
          onClick={() => setActiveTab('timer')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#141b2c] hover:bg-[#1a2338] border border-[#232f4a] text-amber-400 hover:text-amber-300 text-xs font-semibold transition-all cursor-pointer shadow-sm"
        >
          <Timer className="w-4 h-4" />
          <span>Iniciar Sessão de Estudo</span>
        </button>
      </div>

      {/* Main Layout: Subject Selector Sidebar + Dedicated Academic Curriculum View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left column: Subject List Selector (4 cols on lg) */}
        <div className="lg:col-span-4 space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
            Selecione a Disciplina
          </p>
          {subjects.map((subj) => {
            const isSelected = subj.id === activeSubjectId;
            return (
              <div
                key={subj.id}
                onClick={() => setActiveSubjectId(subj.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-[#151c2d] border-sky-500/50 shadow-lg shadow-sky-500/5'
                    : 'bg-[#0f1422] border-[#1e273d] hover:bg-[#121828] hover:border-[#2b3956]'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#1c2438] text-slate-300">
                    {subj.code}
                  </span>
                  <span className="text-xs font-mono font-bold text-sky-400">
                    {subj.progress}%
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white font-sans">
                  {subj.name}
                </h3>

                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 truncate">
                  <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{subj.professors.join(', ')}</span>
                </p>

                {/* Progress bar */}
                <div className="w-full h-1.5 rounded-full bg-[#1b2336] mt-3 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-500 to-blue-500"
                    style={{ width: `${subj.progress}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Right column: Focused Academic Content (8 cols on lg) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Main Subject Banner Card */}
          <div className="rounded-2xl bg-[#0f1422] border border-[#1e273d] p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#1c2438]">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    {currentSubject.code}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">
                    Faculdade Impacta Tecnologia
                  </span>
                </div>
                <h2 className="text-2xl font-extrabold text-white tracking-tight font-sans">
                  {currentSubject.name}
                </h2>
                <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <User className="w-4 h-4 text-sky-400" />
                    <span className="font-semibold text-slate-200">
                      Corpo Docente: {currentSubject.professors.join(' e ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>{currentSubject.schedule}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#141b2c] border border-[#232f4a] text-center shrink-0">
                <span className="text-3xl font-black text-white font-mono leading-none">
                  {currentSubject.progress}%
                </span>
                <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider block mt-1">
                  Carga Concluída
                </span>
                <span className="text-[11px] text-slate-400 font-mono mt-1 block">
                  {currentSubject.completedHours}h / {currentSubject.totalHours}h
                </span>
              </div>
            </div>

            {/* 1. Ementa Oficial do Curso */}
            <div className="mt-5">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4 text-sky-400" />
                <span>Ementa Oficial do Curso</span>
              </h4>
              <p className="text-sm text-slate-300 leading-relaxed bg-[#121826] p-4 rounded-xl border border-[#1f283d]">
                {currentSubject.description}
              </p>
            </div>
          </div>

          {/* 2. Módulos Estruturados da Disciplina */}
          {currentSubject.modules && currentSubject.modules.length > 0 && (
            <div className="rounded-2xl bg-[#0f1422] border border-[#1e273d] p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <span>Módulos de Ensino ({currentSubject.modules.length} Módulos)</span>
                </h4>
                <span className="text-xs font-mono text-slate-400">
                  {currentSubject.totalHours}h Carga Horária Total
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {currentSubject.modules.map((mod) => (
                  <div
                    key={mod.id}
                    className="p-4 rounded-xl bg-[#121826] border border-[#1f283d] hover:border-[#2b3a5c] transition-all"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 font-mono font-bold text-xs border border-amber-500/30">
                          Módulo {mod.number}
                        </span>
                        <h5 className="text-sm font-bold text-white">
                          {mod.title}
                        </h5>
                      </div>
                      <span className="text-xs font-mono text-slate-400 shrink-0">
                        {mod.hours} horas
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed mb-3">
                      {mod.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-2">
                      {mod.topics.map((t, idx) => (
                        <span
                          key={idx}
                          className="text-[11px] px-2.5 py-1 rounded-lg bg-[#182033] text-slate-300 border border-[#232f4a] flex items-center gap-1.5"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                          <span>{t}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Tópicos Ministrados & Competências */}
          <div className="rounded-2xl bg-[#0f1422] border border-[#1e273d] p-6 shadow-xl space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Competências & Habilidades Chave</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {currentSubject.topics.map((topic, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2.5 p-3 rounded-xl bg-[#121826] border border-[#1f283d] text-xs text-slate-300"
                >
                  <span className="w-5 h-5 rounded-md bg-sky-500/15 text-sky-400 font-mono font-bold flex items-center justify-center shrink-0 text-[11px]">
                    {i + 1}
                  </span>
                  <span className="leading-snug font-medium">{topic}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Materiais de Estudo & Acervo Didático */}
          <div className="rounded-2xl bg-[#0f1422] border border-[#1e273d] p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-indigo-400" />
                <span>Materiais de Estudo & Bibliografia Oficial</span>
              </h4>
              <span className="text-xs text-slate-400">
                Acesso aos recursos recomendados pelos professores
              </span>
            </div>

            {currentSubject.materials && currentSubject.materials.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {currentSubject.materials.map((mat) => (
                  <div
                    key={mat.id}
                    className="p-4 rounded-xl bg-[#121826] border border-[#1f283d] hover:border-[#2b3a5c] transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-[#182033] border border-[#232f4a]">
                            {getMaterialIcon(mat.category)}
                          </div>
                          <span className="text-[11px] font-semibold text-slate-300">
                            {mat.format}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#182033] text-amber-300 border border-[#2a3754]">
                          {mat.badge}
                        </span>
                      </div>

                      <h5 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors leading-snug">
                        {mat.title}
                      </h5>

                      <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                        {mat.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#1c2438] flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 font-mono">Disponível no Portal</span>
                      <button 
                        onClick={() => alert(`Acessando: ${mat.title}`)}
                        className="text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <span>Acessar Material</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic p-3 bg-[#121826] rounded-xl border border-[#1f283d]">
                Nenhum material de estudo cadastrado no momento.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
