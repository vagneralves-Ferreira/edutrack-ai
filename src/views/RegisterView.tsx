import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePlanner } from '../context/PlannerContext';
import { 
  Sparkles, 
  User, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  GraduationCap, 
  Calendar,
  ArrowRight,
  AlertTriangle,
  Building2,
} from 'lucide-react';

export const RegisterView: React.FC = () => {
  const navigate = useNavigate();
  const { register, isLoading, isAuthenticated } = useAuth();
  const { setStudentName } = usePlanner();

  const [name, setName] = useState('');
  const [institution, setInstitution] = useState('');
  const [email, setEmail] = useState('');
  const [course, setCourse] = useState('Análise e Desenvolvimento de Sistemas');
  const [semester, setSemester] = useState('1º Semestre');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // If already logged in, redirect to dashboard
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation
    if (!name.trim()) {
      setErrorMessage('Por favor, informe seu nome completo.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Por favor, informe um endereço de e-mail acadêmico válido.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('A senha deve conter no mínimo 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('A confirmação de senha não coincide com a senha digitada.');
      return;
    }

    if (!termsAccepted) {
      setErrorMessage('É necessário aceitar os termos para personalizar seu planner.');
      return;
    }

    const result: any = await register(email.trim(), password, {
      name: name.trim(),
      institution: institution.trim() || 'Minha Faculdade',
      course: course.trim() || 'Graduação',
      semester,
    });
    if (!result.success) {
      setErrorMessage(result.error || 'Não foi possível concluir o cadastro.');
    } else {
      // Sync student name in planner
      setStudentName(name.trim());
      // Successfully redirect to main Dashboard
      navigate('/dashboard', { replace: true });
    }
  };

  const handlePreFillExample = () => {
    setName('Lucas Mendes');
    setInstitution('Cruzeiro do Sul');
    setEmail('lucas.mendes@cruzeirodosul.edu.br');
    setCourse('Engenharia de Software');
    setSemester('3º Semestre');
    setPassword('estudos2026');
    setConfirmPassword('estudos2026');
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-[#0a0d14] text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden select-none font-sans">
      {/* Background ambient lighting */}
      <div className="absolute top-20 right-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-10 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center relative z-10 px-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 p-[1px] shadow-2xl shadow-amber-500/20 mb-3">
          <div className="w-full h-full bg-[#0d121f] rounded-[15px] flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-amber-400" />
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-sans">
          EduTrack <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">AI</span>
        </h1>
        <p className="mt-1.5 text-xs text-slate-400">
          Novo Cadastro de Estudante • Para Qualquer Faculdade
        </p>
      </div>

      {/* Register Form Card */}
      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-xl relative z-10 px-4 sm:px-0">
        <div className="screen-stack-stage pt-6">
          <div
            onClick={() => navigate('/reset-password')}
            className="screen-deck-layer-2 !pointer-events-auto cursor-pointer flex items-start justify-between px-6 pt-1.5 opacity-75 hover:opacity-100 transition-all"
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300/80">
              Alterar Minha Senha
            </span>
            <span className="text-[10px] text-slate-400">Recuperação</span>
          </div>
          <div
            onClick={() => navigate('/login')}
            className="screen-deck-layer-1 !pointer-events-auto cursor-pointer flex items-start justify-between px-6 pt-1.5 opacity-90 hover:opacity-100 transition-all"
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-violet-300">
              Acessar Cockpit • Login
            </span>
            <span className="text-[10px] text-slate-300">Voltar ao Login →</span>
          </div>
          <div className="relative z-10 screen-emerge-behind rounded-3xl bento-card p-7 sm:p-9 shadow-2xl border-violet-500/25">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-7">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Criar Perfil Acadêmico
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Preencha os dados abaixo para configurar sua grade do semestre 2026.2.
              </p>
            </div>

            <button
              type="button"
              onClick={handlePreFillExample}
              className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 bg-amber-500/10 px-3 py-1.5 rounded-lg transition-colors shrink-0 cursor-pointer shadow-sm"
              title="Preenche campos de exemplo de estudante"
            >
              ⚡ Preencher Exemplo
            </button>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/15 shadow-md text-xs animate-in fade-in slide-in-from-top-2">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-red-300 text-xs">
                    {errorMessage}
                  </h4>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Nome Completo */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Nome Completo do Estudante *
              </label>
              <div className="relative rounded-xl">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="ex: Alexandre Silva ou Mariana Costa"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/70 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                />
              </div>
            </div>

            {/* Instituição / Faculdade */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Faculdade / Universidade *
              </label>
              <div className="relative rounded-xl">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Building2 className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  list="institution-suggestions"
                  placeholder="Ex: Faculdade Impacta, Cruzeiro do Sul, FIAP, USP..."
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/70 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                />
                <datalist id="institution-suggestions">
                  <option value="Faculdade Impacta" />
                  <option value="Cruzeiro do Sul" />
                  <option value="FIAP" />
                  <option value="Anhembi Morumbi" />
                  <option value="UNINOVE" />
                  <option value="USP" />
                </datalist>
              </div>
            </div>

            {/* E-mail Acadêmico ou Pessoal */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                E-mail Acadêmico ou Pessoal *
              </label>
              <div className="relative rounded-xl">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  placeholder="seu.nome@faculdade.edu.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/70 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all font-mono"
                />
              </div>
            </div>

            {/* Curso e Semestre */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Curso de Graduação
                </label>
                <div className="relative rounded-xl">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    list="course-suggestions"
                    value={course}
                    onChange={(e) => setCourse(e.target.value)}
                    placeholder="Ex: ADS, Direito, Engenharia..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/70 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                  />
                  <datalist id="course-suggestions">
                    <option value="Análise e Desenvolvimento de Sistemas" />
                    <option value="Engenharia de Software" />
                    <option value="Ciência da Computação" />
                    <option value="Sistemas de Informação" />
                    <option value="Administração" />
                    <option value="Direito" />
                  </datalist>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Semestre Atual *
                </label>
                <div className="relative rounded-xl">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <select
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/70 text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer font-mono transition-all"
                  >
                    <option value="1º Semestre">1º Semestre (Calouro)</option>
                    <option value="2º Semestre">2º Semestre</option>
                    <option value="3º Semestre">3º Semestre</option>
                    <option value="4º Semestre">4º Semestre</option>
                    <option value="5º Semestre">5º Semestre</option>
                    <option value="6º Semestre">6º Semestre</option>
                    <option value="7º Semestre">7º Semestre</option>
                    <option value="8º Semestre">8º Semestre (Formando)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Senha e Confirmação */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Senha de Acesso *
                </label>
                <div className="relative rounded-xl">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Mínimo 6 dígitos"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-8 py-2.5 rounded-xl bg-slate-800/70 text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Confirmar Senha *
                </label>
                <div className="relative rounded-xl">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Repita sua senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/70 text-white text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Terms checkbox */}
            <div className="pt-2">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-slate-800/70 cursor-pointer"
                />
                <span className="leading-snug">
                  Confirmo que sou estudante e autorizo a personalização do meu planner acadêmico no <strong>EduTrack AI</strong>.
                </span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-4 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-slate-950/30 border-t-slate-950 animate-spin" />
                  <span>Criando sua conta acadêmica...</span>
                </>
              ) : (
                <>
                  <span>Concluir Cadastro & Acessar Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Link back to Login */}
          <div className="mt-7 text-center pt-4">
            <p className="text-xs text-slate-400">
              Já possui conta acadêmica?{' '}
              <Link
                to="/login"
                className="font-bold text-amber-400 hover:text-amber-300 underline underline-offset-2 transition-colors ml-1"
              >
                Fazer Login
              </Link>
            </p>
          </div>
          </div>
        </div>

        <p className="mt-5 text-center text-[11px] text-slate-500">
          EduTrack AI • Cockpit Acadêmico Multi-Instituição
        </p>
      </div>
    </div>
  );
};
