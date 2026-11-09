import React from 'react';
import { ArrowRight, Sparkles, GraduationCap, AlertCircle } from 'lucide-react';
import { usePlanner } from '../../context/PlannerContext';

export const GreetingBanner: React.FC = () => {
  const { setActiveTab } = usePlanner();

  return (
    <div className="bg-transparent py-2">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-0 py-1 text-sky-400 text-xs font-semibold mb-2">
            <GraduationCap className="w-4 h-4 text-sky-400" />
            <span>Faculdade Impacta Tecnologia • Semestre 2026.2</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-sans">
            Painel de Gestão & <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-amber-300">Produtividade Acadêmica</span>
          </h2>

          <p className="mt-2.5 text-sm text-slate-300 leading-relaxed">
            Monitore o avanço das 5 disciplinas ativas e organize seus estudos com apoio do cronômetro de foco e do assistente inteligente.
          </p>

          {/* Clean subtle deadline notice floating directly on background */}
          <div className="mt-4 inline-flex items-center gap-2 bg-transparent text-xs text-slate-200">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Aviso acadêmico: <strong className="text-amber-300 font-semibold">Avaliação Parcial MVP de Innovation Lab</strong> (08/09) e Avaliações Parciais em <strong className="text-white">08/09</strong> e <strong className="text-white">10/09</strong>.
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
          <button
            onClick={() => setActiveTab('tarefas')}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs transition-all active:scale-[0.98] cursor-pointer"
          >
            <span>Gerenciar Tarefas</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveTab('ai-assistant')}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-transparent hover:bg-slate-800/40 text-sky-300 hover:text-white font-semibold text-xs transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>EduTrack AI Advisor</span>
          </button>
        </div>
      </div>
    </div>
  );
};
