import React from 'react';
import { BookOpen, Upload, Sparkles, Plus } from 'lucide-react';
import { usePlanner } from '../context/PlannerContext';
import { useTheme } from '../context/ThemeContext';

interface EmptyPlannerStateProps {
  title: string;
  description: string;
  onAddSubject?: () => void;
}

/** Shared empty state when the student has no subjects/tasks yet. */
export const EmptyPlannerState: React.FC<EmptyPlannerStateProps> = ({
  title,
  description,
  onAddSubject,
}) => {
  const {
    setActiveTab,
    setIsClassroomModalOpen,
    setIsNewSubjectModalOpen,
    loadExampleData,
    isLoadingData,
  } = usePlanner();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  return (
    <div className="bento-card rounded-3xl p-8 text-center space-y-4">
      <div
        className={`w-12 h-12 rounded-2xl border flex items-center justify-center mx-auto ${
          isLight
            ? 'bg-violet-100 border-violet-200 text-violet-700'
            : 'bg-violet-500/15 border-violet-500/30 text-violet-300'
        }`}
      >
        <BookOpen className="w-6 h-6" />
      </div>

      <div className="max-w-md mx-auto space-y-1.5">
        <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
          {title}
        </h3>
        <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
          {description}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => setIsClassroomModalOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white text-xs font-bold shadow-lg shadow-violet-600/25 transition-all cursor-pointer"
        >
          <Upload className="w-4 h-4" />
          <span>Importar minha grade</span>
        </button>

        <button
          type="button"
          onClick={
            onAddSubject ??
            (() => {
              setActiveTab('disciplinas');
              setIsNewSubjectModalOpen(true);
            })
          }
          className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
            isLight
              ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
              : 'bg-white/[0.05] hover:bg-white/[0.1] border-white/10 text-slate-200'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>Adicionar manualmente</span>
        </button>
      </div>

      <div className="pt-1">
        <button
          type="button"
          disabled={isLoadingData}
          onClick={() => void loadExampleData()}
          className={`inline-flex items-center gap-1.5 text-[11px] font-medium underline underline-offset-4 transition-colors cursor-pointer disabled:opacity-50 ${
            isLight
              ? 'text-slate-600 hover:text-slate-900'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className={`w-3 h-3 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
          <span>
            {isLoadingData ? 'Preparando demonstração...' : 'Ou explore com uma grade de demonstração'}
          </span>
        </button>
      </div>
    </div>
  );
};
