import React from 'react';
import { ArrowRight, Sparkles, GraduationCap, AlertCircle } from 'lucide-react';
import { usePlanner } from '../../context/PlannerContext';

export const GreetingBanner: React.FC = () => {
  const { setActiveTab } = usePlanner();

  return (
    <div className="bento-card relative overflow-hidden rounded-2xl p-6 sm:p-7 h-full flex flex-col justify-between">
      {/* Subtle decorative radial glow */}
      <div className="pointer-events-none absolute -top-20 -right-20 w-64 h-64 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl" />

      <div className="relative z-10">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[11px] font-semibold mb-3">
          <GraduationCap className="w-3.5 h-3.5 text-sky-400" />
          <span>Faculdade Impacta Tecnologia • Semestre 2026.2</span>
        </div>

        <h2 className="text-xl sm:text-2xl lg:text-[26px] font-extrabold text-white tracking-tight font-sans leading-tight">
          Painel de Gestão &{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-orange-400">
            Produtividade Acadêmica
          </span>
        </h2>

        <p className="mt-2 text-xs sm:text-sm text-slate-300/90 leading-relaxed max-w-2xl">
          Monitore o avanço das 5 disciplinas ativas e organize suas entregas com apoio do cronômetro de foco e do assistente inteligente.
        </p>
      </div>

      <div className="relative z-10 mt-5 pt-4 border-t border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Compact deadline notice pill */}
        <div className="flex items-start sm:items-center gap-2 text-xs text-slate-300 bg-amber-500/[0.07] border border-amber-500/20 rounded-xl px-3 py-2">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
          <span className="leading-snug">
            Destaque: <strong className="text-amber-300 font-semibold">Avaliação Parcial MVP</strong> (08/09) e provas em <strong className="text-white">08/09</strong> e <strong className="text-white">10/09</strong>.
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setActiveTab('tarefas')}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/15 transition-all active:scale-[0.98] cursor-pointer"
          >
            <span>Tarefas</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setActiveTab('ai-assistant')}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.08] text-slate-200 hover:text-white font-semibold text-xs transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>AI Advisor</span>
          </button>
        </div>
      </div>
    </div>
  );
};
