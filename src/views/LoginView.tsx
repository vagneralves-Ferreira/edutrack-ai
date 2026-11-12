import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Sun,
  Moon
} from 'lucide-react';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const LoginView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signIn, register } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [email, setEmail] = useState(() => localStorage.getItem('edutrack_recovery_email') || '');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (user) {
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [user, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      setErrorMessage('Por favor, preencha o e-mail institucional e a senha.');
      return;
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setErrorMessage('Por favor, informe um endereço de e-mail válido.');
      return;
    }

    setLoading(true);
    const result = await signIn(trimmedEmail, password);
    setLoading(false);

    if (!result.success) {
      setErrorMessage(result.error || 'Senha inválida ou usuário não encontrado');
    } else {
      navigate('/dashboard', { replace: true });
    }
  };

  const handleRegister = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail && !password) {
      return;
    }

    e.preventDefault();
    setErrorMessage(null);

    if (!trimmedEmail || !password) {
      setErrorMessage('Por favor, preencha o e-mail institucional e a senha para cadastrar.');
      return;
    }

    if (!EMAIL_REGEX.test(trimmedEmail)) {
      setErrorMessage('Por favor, informe um endereço de e-mail válido.');
      return;
    }

    setLoading(true);
    const result = await register(trimmedEmail, password);
    setLoading(false);

    if (!result?.success) {
      setErrorMessage(result?.error || 'Não foi possível concluir o cadastro.');
    } else {
      navigate('/dashboard', { replace: true });
    }
  };

  const handleResetPassword = async () => {
    if (!email.trim()) {
      setErrorMessage('Por favor, preencha o e-mail institucional para recuperar a senha.');
      return;
    }
    const cleanEmail = email.trim();
    localStorage.setItem('edutrack_recovery_email', cleanEmail);
    setLoading(true);
    const baseOrigin = window.location.origin.startsWith('http')
      ? window.location.origin
      : 'https://edutrack-ai-mauve-eight.vercel.app';
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: `${baseOrigin}/reset-password`,
    });
    setLoading(false);
    
    if (error) {
      setErrorMessage(error.message);
    } else {
      alert('Se o e-mail estiver registrado, receberá um link para redefinir a senha.');
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-slate-100 flex items-center justify-center p-6 relative">
      {/* Floating Theme Toggle on Login Screen */}
      <button
        type="button"
        onClick={toggleTheme}
        className="fixed top-5 right-5 z-50 flex items-center gap-2 px-3.5 py-2 rounded-xl bento-card text-xs font-semibold text-slate-200 hover:border-violet-500/40 transition-all cursor-pointer"
      >
        {theme === 'dark' ? (
          <>
            <Sun className="w-4 h-4 text-amber-400" />
            <span>Modo Claro</span>
          </>
        ) : (
          <>
            <Moon className="w-4 h-4 text-violet-600" />
            <span>Modo Escuro</span>
          </>
        )}
      </button>

      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 rounded-3xl bento-card overflow-hidden shadow-2xl border-violet-500/25">
        {/* Left Branding Bento Showcase */}
        <div className="hidden lg:flex lg:col-span-6 p-10 bg-gradient-to-br from-violet-950/60 via-[#0d0e18] to-cyan-950/40 border-r border-white/[0.08] flex-col justify-between relative overflow-hidden">
          <div className="pointer-events-none absolute -top-20 -left-20 w-72 h-72 rounded-full bg-violet-600/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -right-20 w-72 h-72 rounded-full bg-cyan-500/20 blur-3xl" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/[0.08] border border-white/[0.12] mb-6">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-extrabold tracking-wide text-white">EDUTRACK AI 2.0</span>
            </div>

            <h2 className="text-3xl font-black text-white leading-tight tracking-tight">
              Seu Cockpit Acadêmico{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-300">
                Inteligente
              </span>
            </h2>
            <p className="text-xs text-slate-300/85 mt-3 leading-relaxed">
              Planejamento em Bento Grid integrado ao Supabase e Gemini AI para as disciplinas da Faculdade Impacta Tecnologia.
            </p>
          </div>

          <div className="relative z-10 space-y-2.5 text-xs text-slate-300">
            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08]">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Sincronização em nuvem via Supabase</span>
            </div>
            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08]">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Dicas de estudo com Gemini AI em tempo real</span>
            </div>
          </div>
        </div>

        {/* Right Login Form */}
        <div className="lg:col-span-6 p-7 sm:p-10 flex flex-col justify-center">
          <div className="mb-6">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Acessar Cockpit</h1>
            <p className="text-slate-400 text-xs mt-1">Entre com sua conta institucional da Faculdade Impacta</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">E-mail institucional</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome@impacta.edu.br"
                  className="w-full bg-white/[0.04] border border-white/[0.09] rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/[0.04] border border-white/[0.09] rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded bg-white/10 accent-violet-500"
                />
                Lembrar de mim
              </label>
              <button type="button" onClick={handleResetPassword} className="text-cyan-400 hover:text-violet-300 font-semibold cursor-pointer">
                Esqueci a senha
              </button>
            </div>

            {errorMessage && (
              <div className="flex items-start gap-2 bg-rose-500/15 border border-rose-500/30 rounded-xl px-3.5 py-2.5 text-xs text-rose-300">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 disabled:opacity-60 text-white font-bold rounded-xl py-3 text-sm shadow-lg shadow-violet-600/25 transition-all cursor-pointer"
            >
              {loading ? 'Entrando...' : 'Entrar no EduTrack AI'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <p className="text-center text-xs text-slate-400 mt-6">
            Não tem conta?{' '}
            <Link to="/cadastro" onClick={handleRegister} className="text-cyan-400 hover:text-violet-300 font-bold">
              Cadastre-se gratuitamente
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
