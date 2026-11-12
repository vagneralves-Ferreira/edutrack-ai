import React, { useState } from 'react';
import { Sparkles, RefreshCw, AlertCircle, Wand2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AiDicaProps {
  tela: string;
  contexto?: Record<string, unknown>;
}

export const AiDica: React.FC<AiDicaProps> = ({ tela, contexto }) => {
  const [dica, setDica] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const pedirDica = async () => {
    setLoading(true);
    setErro(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setErro('Não foi possível validar sua sessão. Faça login novamente para pedir uma dica.');
        setDica(null);
        return;
      }

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-dicas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ tela, contexto }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.dica) {
        setErro('Não conseguimos gerar sua dica agora. Tente novamente em instantes.');
        setDica(null);
        return;
      }

      setDica(data.dica);
    } catch {
      setErro('Ocorreu um problema de conexão ao buscar a dica. Que tal tentar de novo?');
      setDica(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bento-card relative overflow-hidden rounded-2xl p-5 sm:p-6 h-full flex flex-col justify-between gap-4 border-indigo-500/20">
      {/* Ambient AI Glow */}
      <div className="pointer-events-none absolute -top-16 -right-16 w-48 h-48 rounded-full bg-indigo-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 w-40 h-40 rounded-full bg-amber-500/10 blur-3xl" />

      <div className="relative z-10 flex items-start gap-3.5 min-w-0">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-indigo-500/20 border border-amber-500/30 text-amber-400 shrink-0 mt-0.5 shadow-inner">
          <Sparkles className="w-4 h-4" />
        </div>

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/25">
                IA Dica Copilot
              </span>
              <span className="text-[11px] text-slate-400 font-mono">• {tela}</span>
            </div>
            <span className="text-[10px] text-indigo-300/80 font-mono hidden sm:inline">
              Gemini 2.5 Flash
            </span>
          </div>

          {loading ? (
            <div className="py-2 space-y-2">
              <p className="text-xs sm:text-sm text-amber-300/90 font-medium animate-pulse">
                Analisando seu contexto acadêmico...
              </p>
              <div className="w-2/3 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <div className="h-full w-1/2 bg-gradient-to-r from-amber-400 to-indigo-400 animate-pulse rounded-full" />
              </div>
            </div>
          ) : erro ? (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{erro}</span>
            </div>
          ) : dica ? (
            <p className="text-xs sm:text-sm text-slate-100 leading-relaxed bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
              {dica}
            </p>
          ) : (
            <p className="text-xs sm:text-sm text-slate-300/85 leading-relaxed">
              Receba uma recomendação rápida e personalizada da IA para priorizar seus estudos em <strong className="text-white font-semibold">{tela}</strong>.
            </p>
          )}
        </div>
      </div>

      <div className="relative z-10 flex items-center justify-between pt-3 border-t border-white/[0.06] gap-3">
        <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
          <Wand2 className="w-3.5 h-3.5 text-indigo-400" />
          <span>Sugestão contextual sob demanda</span>
        </span>

        <button
          type="button"
          onClick={pedirDica}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/15 transition-all active:scale-[0.98] disabled:opacity-60 shrink-0 cursor-pointer"
        >
          {loading ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Pensando...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>{dica ? 'Nova dica' : 'Pedir dica'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default AiDica;
