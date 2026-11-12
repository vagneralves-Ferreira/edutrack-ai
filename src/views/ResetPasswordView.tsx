import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Lock, KeyRound, AlertTriangle, ArrowRight, CheckCircle2, ArrowLeft, Mail, RefreshCw } from 'lucide-react';

interface ResetPasswordViewProps {
  initialExpired?: boolean;
  onFinishRecovery?: () => void;
}

export const ResetPasswordView: React.FC<ResetPasswordViewProps> = ({
  initialExpired = false,
  onFinishRecovery,
}) => {
  const [email, setEmail] = useState<string>(() => localStorage.getItem('edutrack_recovery_email') || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [hasValidSession, setHasValidSession] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    initialExpired
      ? 'Você clicou em um link de e-mail antigo que já expirou. Clique em "Reenviar Novo Link" abaixo e abra a última mensagem da conversa no seu Gmail.'
      : null
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setHasValidSession(true);
        setErrorMessage(null);
        if (session.user.email) {
          setEmail(session.user.email);
        }
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setHasValidSession(true);
        setErrorMessage(null);
        if (session.user.email) {
          setEmail(session.user.email);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const exitToLogin = () => {
    window.history.replaceState(null, '', '/#/login');
    window.location.hash = '#/login';
    onFinishRecovery?.();
    navigate('/login', { replace: true });
  };

  const handleResendLink = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage('Preencha seu e-mail institucional no campo acima para receber um novo link.');
      return;
    }

    setResending(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    localStorage.setItem('edutrack_recovery_email', cleanEmail);

    const baseOrigin = window.location.origin.startsWith('http')
      ? window.location.origin
      : 'https://edutrack-ai-mauve-eight.vercel.app';

    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: `${baseOrigin}/reset-password`,
    });

    setResending(false);

    if (error) {
      setErrorMessage(error.message);
    } else {
      setSuccessMessage(
        'Novo link enviado! No seu Gmail, role até a ÚLTIMA mensagem no final da conversa e clique em "Reset password".'
      );
    }
  };

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

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setLoading(false);
        setHasValidSession(false);
        setErrorMessage(
          'O link do e-mail utilizado já expirou. Clique em "Reenviar Novo Link por E-mail" abaixo e abra a mensagem mais recente no final da conversa do Gmail.'
        );
        return;
      }

      // Encerra a sessão temporária de recuperação para que o usuário volte para a tela de login e entre com a nova senha
      await supabase.auth.signOut();
      localStorage.removeItem('edutrack_recovery_email');

      setSuccessMessage('Senha alterada com sucesso! Retornando para a tela de login...');
      setLoading(false);

      setTimeout(() => {
        exitToLogin();
      }, 1200);
    } catch {
      setErrorMessage('Erro de conexão ao alterar a senha. Tente novamente.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md bento-card rounded-3xl p-8 border-violet-500/25 shadow-2xl">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-500/15 border border-violet-500/30 mb-4 shadow-lg shadow-violet-500/20">
            <KeyRound className="w-7 h-7 text-cyan-400" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Alterar Minha Senha</h1>
          <p className="text-slate-400 text-xs mt-1">
            Defina sua nova senha e retorne ao login para acessar o EduTrack AI
          </p>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              E-mail Institucional
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@aluno.impacta.edu.br"
                className="w-full bg-white/[0.04] border border-white/[0.09] rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-all"
              />
            </div>
          </div>

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
            <div className="space-y-2.5">
              <div className="flex items-start gap-2 bg-rose-500/15 border border-rose-500/30 rounded-xl px-3.5 py-2.5 text-xs text-rose-300">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{errorMessage}</span>
              </div>

              {!hasValidSession && (
                <button
                  type="button"
                  onClick={handleResendLink}
                  disabled={resending}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-violet-500/40 text-xs font-bold text-cyan-300 transition-all cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
                  <span>{resending ? 'Enviando...' : 'Reenviar Novo Link por E-mail'}</span>
                </button>
              )}
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
            {loading ? 'Alterando senha...' : 'Alterar minha senha'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={exitToLogin}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar para a Tela de Login</span>
          </button>
        </form>
      </div>
    </div>
  );
};
