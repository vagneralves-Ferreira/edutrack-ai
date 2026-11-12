import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  Clock,
  Sparkles, 
  AlertCircle,
  Edit2,
  Check,
  LogOut
} from 'lucide-react';
import { usePlanner } from '../../context/PlannerContext';
import { useAuth } from '../../context/AuthContext';
import { getGreeting } from '../../utils/helpers';

function formatCurrentDateTime(date = new Date()): string {
  const days = [
    'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
    'Quinta-feira', 'Sexta-feira', 'Sábado'
  ];
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const dayName = days[date.getDay()];
  const day = String(date.getDate()).padStart(2, '0');
  const monthName = months[date.getMonth()];
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${dayName}, ${day} de ${monthName} de ${year} - ${hours}:${minutes}`;
}

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const { studentName, setStudentName, tasks, setActiveTab } = usePlanner();
  const { currentUser, logout } = useAuth();
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(studentName);
  const [showNotifications, setShowNotifications] = useState(false);

  // Dynamic real-time clock state updated every second
  const [currentDateTime, setCurrentDateTime] = useState<string>(() => formatCurrentDateTime());

  useEffect(() => {
    const updateTime = () => {
      setCurrentDateTime(formatCurrentDateTime());
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const { greeting } = getGreeting(studentName);

  const criticalTasks = tasks.filter(t => t.status !== 'completed' && (t.isCriticalMvp || (t.type === 'avaliacao' && t.priority === 'critica')));

  const handleSaveName = () => {
    if (tempName.trim()) {
      setStudentName(tempName.trim());
    }
    setIsEditingName(false);
  };

  return (
    <header className="h-16 bg-[#06080f]/75 backdrop-blur-xl border-b border-white/[0.06] px-6 lg:px-8 flex items-center justify-between sticky top-0 z-20 transition-all">
      {/* Personalized Greeting & Subtitle */}
      <div className="flex items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            {isEditingName ? (
              <div className="flex items-center gap-1.5 bg-[#101522] px-2.5 py-1 rounded-lg border border-white/[0.12]">
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="bg-transparent text-white font-bold text-base outline-none w-48 font-sans"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                />
                <button 
                  onClick={handleSaveName}
                  className="p-1 text-emerald-400 hover:text-emerald-300 rounded cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-white font-sans flex items-center gap-1.5">
                  {greeting}
                  <span className="text-amber-400">⚡</span>
                </h1>
                <button
                  onClick={() => { setTempName(studentName); setIsEditingName(true); }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
                  title="Editar nome do perfil"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
          <p className="text-[11px] text-slate-400 font-medium tracking-wide flex items-center gap-2">
            <span className="text-sky-400 font-semibold uppercase tracking-wider text-[9px] px-1.5 py-0.2 bg-sky-500/10 rounded border border-sky-500/20">
              planner acadêmico
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400 hidden sm:inline">Faculdade Impacta Tecnologia</span>
          </p>
        </div>
      </div>

      {/* Right controls: Date badge, Notification center, AI Trigger */}
      <div className="flex items-center gap-2.5">

        {/* Real-time Dynamic Clock */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.07] text-xs font-medium text-slate-300">
          <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="font-sans font-medium tracking-tight text-[11px]">
            {currentDateTime}
          </span>
        </div>

        {/* Notifications Dropdown Toggle */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.07] text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Notificações e Avisos"
          >
            <Bell className="w-4 h-4" />
            {criticalTasks.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-[#06080f]" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-[#0d1220]/95 backdrop-blur-2xl border border-white/[0.1] shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.07]">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Avisos Acadêmicos</h4>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-semibold">{criticalTasks.length} críticos</span>
              </div>
              <div className="py-2.5 space-y-2 max-h-64 overflow-y-auto">
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs">
                  <div className="flex items-center gap-1.5 text-amber-300 font-semibold mb-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>08/09: Avaliações Parciais</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Software Engineering (Prof. Fábio Nogueira) e Avaliação Parcial MVP de Innovation Lab.
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/25 text-xs">
                  <div className="flex items-center gap-1.5 text-sky-300 font-semibold mb-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>10/09: Prova & Modelo 3FN</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    SQL Fundamentals (Prof. Evandro) e Database Design.
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setShowNotifications(false); setActiveTab('tarefas'); }}
                className="w-full mt-2 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.07] text-xs font-semibold text-slate-200 text-center transition-colors block cursor-pointer"
              >
                Abrir Central de Tarefas
              </button>
            </div>
          )}
        </div>

        {/* AI Quick Assistant Trigger */}
        <button
          onClick={() => setActiveTab('ai-assistant')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500/15 to-purple-500/15 hover:from-indigo-500/25 hover:to-purple-500/25 border border-indigo-500/30 text-indigo-200 text-xs font-semibold transition-all cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">IA Dicas</span>
        </button>

        {/* User Profile & Logout Button */}
        <div className="flex items-center gap-2.5 pl-2.5 border-l border-white/[0.07]">
          <div className="hidden xl:flex flex-col text-right">
            <span className="text-xs font-bold text-white leading-none">
              {currentUser?.name || studentName}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 font-medium">
              {currentUser?.course || 'Impacta 2026.2'}
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 hover:border-rose-500/35 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
            title="Sair da Conta (Logout)"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair</span>
          </button>
        </div>
      </div>
    </header>
  );
};
