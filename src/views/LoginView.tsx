import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Sparkles, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  AlertTriangle, 
  ArrowRight, 
  GraduationCap, 
  CheckCircle2, 
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, isLoading, demoCredentials } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // If already logged in, redirect to dashboard
  React.useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Por favor, preencha o e-mail institucional e a senha.');
      return;
    }

    const result = await login({
      email,
      password,
      rememberMe
    });

    if (!result.success) {
      setErrorMessage(result.error || 'Senha inválida ou usuário não encontrado');
    } else {
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  };

  const handleFillDemo = () => {
    setEmail(demoCredentials.email);
    setPassword(demoCredentials.password);
    setErrorMessage(null);
  };

  const handleSimulateError = () => {
    setEmail('estudante.demo@impacta.edu.br');
    setPassword('senha_incorreta_123');
    setErrorMessage('Senha inválida ou usuário não encontrado');
  };

  return (
    <div className="min-h-screen bg-[#0a0d14] text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden select-none font-sans">
      {/* Ambient background glow effects (Obsidian Dark signature) */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header / Brand */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 p-[1px] shadow-2xl shadow-amber-500/20 mb-4">
          <div className="w-full h-full bg-[#0d121f] rounded-[15px] flex items-center justify-center">
            <Sparkles className="w-7 h-7 text-amber-400" />
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-sans">
          EduTrack <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">AI</span>
        </h1>
        <p className="mt-1 text-xs text-slate-400 font-medium">
          Plataforma de Gestão Acadêmica & Estudos • Faculdade Impacta
        </p>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 mt-3 rounded-full bg-[#121828] border border-[#232d44] text-[11px] text-sky-300 font-semibold">
          <GraduationCap className="w-3.5 h-3.5 text-sky-400" />
          <span>Acesso do Estudante • Semestre 2026.2</span>
        </div>
      </div>

      {/* Login Card */}
      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="rounded-2xl bg-[#0f1422]/90 backdrop-blur-xl border border-[#1e273d] p-6 sm:p-8 shadow-2xl shadow-black/60 relative">
          
          {/* Section Subtitle */}
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white tracking-tight">
              Acesse sua conta
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Entre com seu e-mail institucional da Impacta para visualizar seu cronograma e disciplinas.
            </p>
          </div>

          {/* Interactive Error Alert State (Red / Amber tones) */}
          {errorMessage && (
            <div className="mb-5 p-4 rounded-xl bg-gradient-to-r from-red-950/40 via-red-900/20 to-amber-950/30 border-2 border-red-500/50 shadow-lg shadow-red-950/30 text-xs animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-red-300 text-sm tracking-tight flex items-center gap-1.5">
                    {errorMessage}
                  </h4>
                  <p className="text-slate-300 text-[11px] mt-1 leading-relaxed">
                    Verifique se o e-mail acadêmico ou a senha digitada estão corretos. (Conta demo: <code className="text-amber-300 font-mono font-semibold">alexandre@impacta.edu.br</code> / <code className="text-amber-300 font-mono font-semibold">impacta2026</code>)
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                E-mail Institucional
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  placeholder="ex: seu.nome@impacta.edu.br"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#141a29] border text-white text-xs placeholder:text-slate-500 focus:outline-none transition-all ${
                    errorMessage 
                      ? 'border-red-500/60 focus:border-red-400 ring-1 ring-red-500/30' 
                      : 'border-[#232f48] focus:border-amber-400'
                  }`}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Senha de Acesso
                </label>
                <button
                  type="button"
                  onClick={() => alert('Em caso de esquecimento da senha acadêmica, utilize o portal do aluno Impacta ou o login demonstrativo.')}
                  className="text-[11px] font-semibold text-sky-400 hover:text-sky-300 transition-colors"
                >
                  Esqueceu a senha?
                </button>
              </div>

              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  className={`w-full pl-10 pr-10 py-2.5 rounded-xl bg-[#141a29] border text-white text-xs placeholder:text-slate-500 focus:outline-none transition-all ${
                    errorMessage 
                      ? 'border-red-500/60 focus:border-red-400 ring-1 ring-red-500/30' 
                      : 'border-[#232f48] focus:border-amber-400'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                  title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 bg-slate-900 border-slate-700 cursor-pointer"
                />
                <span>Lembrar meu acesso</span>
              </label>

              <span className="text-[10px] text-slate-500 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Impacta SSO Auth
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-3 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-slate-950/30 border-t-slate-950 animate-spin" />
                  <span>Validando credenciais...</span>
                </>
              ) : (
                <>
                  <span>Acessar Plataforma</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Shortcuts (For Evaluator Ease of Test) */}
          <div className="mt-6 pt-5 border-t border-[#1c2438]">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2.5 text-center">
              Atalhos Rápidos de Demonstração
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleFillDemo}
                className="px-3 py-2 rounded-lg bg-[#141b2c] hover:bg-[#1a233a] border border-[#232f4a] text-[11px] font-semibold text-amber-300 hover:text-amber-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                title="Preenche a conta demo oficial de Alexandre (Impacta)"
              >
                <span>⚡ Preencher Demo</span>
              </button>

              <button
                type="button"
                onClick={handleSimulateError}
                className="px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-[11px] font-semibold text-red-300 hover:text-red-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                title="Gera a validação com erro estilizado em vermelho/âmbar"
              >
                <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                <span>Simular Erro</span>
              </button>
            </div>
          </div>

          {/* Link to Registration */}
          <div className="mt-6 text-center pt-4 border-t border-[#1c2438]">
            <p className="text-xs text-slate-400">
              Ainda não tem conta acadêmica?{' '}
              <Link
                to="/cadastro"
                className="font-bold text-amber-400 hover:text-amber-300 underline underline-offset-2 transition-colors ml-1"
              >
                Cadastre-se na Impacta
              </Link>
            </p>
          </div>
        </div>

        {/* Security / Institutional Footer */}
        <p className="mt-4 text-center text-[11px] text-slate-500">
          EduTrack AI • Ambiente Seguro Integrado com Faculdade Impacta Tecnologia
        </p>
      </div>
    </div>
  );
};
