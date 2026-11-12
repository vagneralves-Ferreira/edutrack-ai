import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Lock, KeyRound, AlertTriangle, ArrowRight, CheckCircle2, ArrowLeft } from 'lucide-react';

export const ResetPasswordView: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const rawHash = window.location.hash || '';
    const rawSearch = window.location.search || '';
    if (rawHash.includes('otp_expired') || rawSearch.includes('otp_expired')) {
      setErrorMessage(
        'Este link de recuperação expirou ou já foi utilizado. Volte ao login e clique em "Esqueci a senha" para gerar um link novo.'
      );
    }
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!password || !confirmPassword) {
      setErrorMessage('Por favor, preencha a nova senha e a confirmação.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('As senhas informadas não coincidem.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setErrorMessage(
        error.message.includes('Auth session missing')
          ? 'Sessão de recuperação expirada. Solicite um novo link em "Esqueci a senha" na tela de login.'
          : error.message
      );
    } else {
      setSuccessMessage('Senha atualizada com sucesso! Redirecionando para o painel...');
      if (window.location.pathname !== '/') {
        window.history.replaceState(null, '', '/#/login');
      }
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 1500);
    }
  };

  const handleBackToLogin = () => {
    if (window.location.pathname !== '/') {
      window.history.replaceState(null, '', '/#/login');
    }
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-transparent text-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md bento-card rounded-3xl p-8 border-violet-500/25 shadow-2xl">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-500/15 border border-violet-500/30 mb-4 shadow-lg shadow-violet-500/20">
            <KeyRound className="w-7 h-7 text-cyan-400" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Redefinir Senha</h1>
          <p className="text-slate-400 text-xs mt-1">
            Escolha sua nova senha de acesso ao EduTrack AI
          </p>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Nova Senha</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo de 6 caracteres"
                className="w-full bg-white/[0.04] border border-white/[0.09] rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Confirmar Nova Senha
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                className="w-full bg-white/[0.04] border border-white/[0.09] rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-all"
              />
            </div>
          </div>

          {errorMessage && (
            <div className="flex items-start gap-2 bg-rose-500/15 border border-rose-500/30 rounded-xl px-3.5 py-2.5 text-xs text-rose-300">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-start gap-2 bg-emerald-500/15 border border-emerald-500/30 rounded-xl px-3.5 py-2.5 text-xs text-emerald-300">
              <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 disabled:opacity-60 text-white font-bold rounded-xl py-3 text-sm shadow-lg shadow-violet-600/25 transition-all cursor-pointer"
          >
            {loading ? 'Atualizando...' : 'Salvar Nova Senha'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={handleBackToLogin}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar para o Login</span>
          </button>
        </form>
      </div>
    </div>
  );
};
