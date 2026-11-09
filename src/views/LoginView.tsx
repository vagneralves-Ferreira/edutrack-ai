import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  ArrowRight,
  GraduationCap
} from 'lucide-react';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const LoginView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signIn, register } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Redireciona para o dashboard se já estiver autenticado
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
      // Sem dados preenchidos na tela de login, segue para a tela dedicada /cadastro
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
      setErrorMessage('Por favor, preencha o e-mail institucional para recuperar a palavra-passe.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    
    if (error) {
      setErrorMessage(error.message);
    } else {
      alert('Se o e-mail estiver registado, receberá um link para redefinir a palavra-passe.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0c10] text-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 shadow-md mb-4">
            <GraduationCap className="w-7 h-7 text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">EduTrack AI</h1>
          <p className="text-slate-400 text-sm mt-1">Planner Acadêmico · Faculdade Impacta</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-slate-800/50 rounded-2xl p-7 shadow-xl space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">E-mail institucional</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@exemplo.com"
                className="w-full bg-slate-800/70 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Senha</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-800/70 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
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

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded bg-slate-800/70 accent-amber-500"
              />
              Lembrar de mim
            </label>
            <button type="button" onClick={handleResetPassword} className="text-amber-400 hover:text-amber-300 cursor-pointer">
              Esqueci a senha
            </button>
          </div>

          {errorMessage && (
            <div className="flex items-start gap-2 bg-red-500/15 rounded-xl px-3.5 py-2.5 text-sm text-red-400 shadow-sm">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-[#0a0c10] font-semibold rounded-xl py-2.5 text-sm shadow-md transition-colors cursor-pointer"
          >
            {loading ? 'Entrando...' : 'Entrar'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <p className="text-center text-sm text-slate-400 mt-6">
          Não tem conta?{' '}
          <Link to="/cadastro" onClick={handleRegister} className="text-amber-400 hover:text-amber-300 font-medium">
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  );
};
