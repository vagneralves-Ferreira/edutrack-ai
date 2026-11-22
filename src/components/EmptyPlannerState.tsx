import React from 'react';
import { BookOpen, BookMarked, Sparkles, Plus, AlertTriangle } from 'lucide-react';
import { usePlanner } from '../context/PlannerContext';

interface EmptyPlannerStateProps {
  title: string;
  description: string;
  onAddSubject?: () => void;
}

/** Shared empty state and error banner when Supabase returns no subjects/tasks or errors. */
export const EmptyPlannerState: React.FC<EmptyPlannerStateProps> = ({
  title,
  description,
  onAddSubject,
}) => {
  const { setActiveTab, setIsClassroomModalOpen, loadExampleData, isLoadingData, loadError } = usePlanner();

  return (
    <div className="space-y-4">
      {loadError && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{loadError}</span>
        </div>
      )}

      <div className="bento-card rounded-3xl p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center mx-auto text-violet-300">
          <BookOpen className="w-6 h-6" />
        </div>
        <div className="max-w-md mx-auto space-y-1.5">
          <h3 className="text-base font-bold text-white">{title}</h3>
          <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={onAddSubject ?? (() => setActiveTab('disciplinas'))}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white text-xs font-bold shadow-lg shadow-violet-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Disciplina</span>
          </button>
          <button
            type="button"
            onClick={() => setIsClassroomModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold transition-all cursor-pointer"
          >
            <BookMarked className="w-4 h-4" />
            <span>Importar do Portal</span>
          </button>
        </div>

        <div className="pt-1">
          <button
            type="button"
            disabled={isLoadingData}
            onClick={() => void loadExampleData()}
            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400 hover:text-slate-200 underline underline-offset-4 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>{isLoadingData ? 'Preparando demonstração...' : 'Ou explore com uma grade de demonstração'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
