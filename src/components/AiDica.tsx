import React, { useState } from 'react';
import { Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
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
    <div className="rounded-2xl bg-slate-800/50 border border-slate-700/50 p-4 sm:p-5 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-start gap-3 min-w-0">
        <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 shrink-0 mt-0.5">
          <Sparkles className="w-4 h-4" />
        </div>

        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              IA Dica
            </span>
            <span className="text-[11px] text-slate-400 font-mono">• {tela}</span>
          </div>

          {loading ? (
            <p className="text-xs sm:text-sm text-slate-300 animate-pulse">
              Pensando...
            </p>
          ) : erro ? (
            <div className="flex items-center gap-1.5 text-xs sm:text-sm text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{erro}</span>
            </div>
          ) : dica ? (
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
              {dica}
            </p>
          ) : (
            <p className="text-xs sm:text-sm text-slate-400">
              Receba uma recomendação rápida e personalizada da IA para seus estudos nesta tela.
            </p>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={pedirDica}
        disabled={loading}
        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/15 transition-all active:scale-[0.98] disabled:opacity-60 shrink-0 cursor-pointer"
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
  );
};

export default AiDica;
