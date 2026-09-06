import React from 'react';
import { Calendar, ArrowRight, Sparkles, GraduationCap, AlertCircle } from 'lucide-react';
import { usePlanner } from '../../context/PlannerContext';

export const GreetingBanner: React.FC = () => {
  const { setActiveTab } = usePlanner();

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#101524] via-[#131a2e] to-[#0f1422] border border-[#202b44] p-6 shadow-xl mb-8">
      {/* Background ambient light effects */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/25 text-sky-300 text-xs font-semibold mb-3">
            <GraduationCap className="w-3.5 h-3.5 text-sky-400" />
            <span>Faculdade Impacta Tecnologia • Semestre 2026.2</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-sans">
            Painel de Gestão & <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-amber-300">Produtividade Acadêmica</span>
          </h2>

          <p className="mt-2 text-sm text-slate-300 leading-relaxed">
            Monitore o avanço das 5 disciplinas ativas e organize seus estudos com apoio do cronômetro de foco e do assistente inteligente.
          </p>

          {/* Clean subtle deadline notice */}
          <div className="mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#0c101a]/90 border border-amber-500/30 text-xs text-slate-300">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Aviso acadêmico: <strong className="text-amber-300 font-semibold">Avaliação Parcial MVP de Innovation Lab</strong> (08/09) e Avaliações Parciais em <strong className="text-white">08/09</strong> e <strong className="text-white">10/09</strong>.
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0">
          <button
            onClick={() => setActiveTab('tarefas')}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/15 transition-all active:scale-[0.98] cursor-pointer"
          >
            <span>Gerenciar Tarefas</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveTab('ai-assistant')}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#172033] hover:bg-[#202b44] border border-[#2b3a5c] text-sky-200 hover:text-white font-semibold text-xs transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>EduTrack AI Advisor</span>
          </button>
        </div>
      </div>
    </div>
  );
};
