import React, { useState } from 'react';
import { Sparkles, RefreshCw, AlertCircle, Bot } from 'lucide-react';
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
        setErro('Sessão expirada. Faça login novamente para gerar uma dica.');
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
      setErro('Problema de conexão ao buscar a dica. Tente novamente.');
      setDica(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bento-card relative overflow-hidden rounded-3xl p-5 h-full flex flex-col justify-between gap-4 border-fuchsia-500/25">
      <div className="pointer-events-none absolute -top-12 -right-12 w-40 h-40 rounded-full bg-fuchsia-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-12 -left-12 w-40 h-40 rounded-full bg-violet-600/20 blur-3xl" />

      <div className="relative z-10 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-md shadow-violet-600/30">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-extrabold text-white block leading-none">
                Gemini AI Insight
              </span>
              <span className="text-[10px] text-fuchsia-300 font-mono">
                Contexto: {tela}
              </span>
            </div>
          </div>

          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="IA Online" />
        </div>

        {loading ? (
          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-2">
            <p className="text-xs text-fuchsia-300 font-medium animate-pulse">
              Consultando Gemini para {tela}...
            </p>
            <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full w-1/2 bg-gradient-to-r from-violet-500 to-cyan-400 animate-pulse rounded-full" />
            </div>
          </div>
        ) : erro ? (
          <div className="flex items-start gap-2 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{erro}</span>
          </div>
        ) : dica ? (
          <div className="p-3 rounded-2xl bg-violet-500/10 border border-violet-500/25 text-xs text-slate-100 leading-relaxed">
            {dica}
          </div>
        ) : (
          <p className="text-xs text-slate-300/85 leading-relaxed bg-black/25 rounded-2xl p-3 border border-white/[0.05]">
            Clique abaixo para gerar uma recomendação tática de estudo personalizada via Supabase Edge Function + Gemini.
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={pedirDica}
        disabled={loading}
        className="relative z-10 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-violet-600/25 transition-all active:scale-[0.98] disabled:opacity-60 cursor-pointer"
      >
        {loading ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Gerando...</span>
          </>
        ) : (
          <>
            <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
            <span>{dica ? 'Gerar Nova Dica IA' : 'Pedir Dica à IA'}</span>
          </>
        )}
      </button>
    </div>
  );
};

export default AiDica;
