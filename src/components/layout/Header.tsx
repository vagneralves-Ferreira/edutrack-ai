import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  Calendar, 
  Clock,
  Sparkles, 
  AlertCircle,
  Edit2,
  Check,
  LogOut,
  User as UserIcon
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
    <header className="h-20 bg-[#0d111a]/80 backdrop-blur-md border-b border-[#1c2333] px-8 flex items-center justify-between sticky top-0 z-20 transition-all">
      {/* Personalized Greeting & Subtitle */}
      <div className="flex items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            {isEditingName ? (
              <div className="flex items-center gap-1.5 bg-[#141926] px-2 py-1 rounded-lg border border-[#2b354d]">
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="bg-transparent text-white font-bold text-lg outline-none w-48 font-sans"
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
                <h1 className="text-xl font-bold tracking-tight text-white font-sans flex items-center gap-1.5">
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
          <p className="text-xs text-slate-400 font-medium tracking-wide flex items-center gap-2 mt-0.5">
            <span className="text-sky-400 font-semibold uppercase tracking-wider text-[10px] px-1.5 py-0.5 bg-sky-950/60 rounded border border-sky-800/40">
              planner acadêmico
            </span>
            <span>•</span>
            <span className="text-slate-400">Faculdade Impacta Tecnologia</span>
          </p>
        </div>
      </div>

      {/* Right controls: Date badge, Notification center, AI Trigger */}
      <div className="flex items-center gap-3">

        {/* Real-time Dynamic Clock */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#141926] border border-[#222b3d] text-xs font-medium text-slate-300 shadow-sm">
          <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="font-sans font-medium tracking-tight">
            {currentDateTime}
          </span>
        </div>

        {/* Notifications Dropdown Toggle */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2.5 rounded-xl bg-[#141926] hover:bg-[#1a2233] border border-[#222b3d] text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Notificações e Avisos"
          >
            <Bell className="w-4 h-4" />
            {criticalTasks.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-[#0d111a]" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl bg-[#111624] border border-[#252f47] shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between pb-3 border-b border-[#20293d]">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Avisos Acadêmicos</h4>
                <span className="text-[10px] text-slate-400">{criticalTasks.length} críticos</span>
              </div>
              <div className="py-2 space-y-2 max-h-64 overflow-y-auto">
                <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs">
                  <div className="flex items-center gap-1.5 text-amber-300 font-semibold mb-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>08/09: Avaliações Parciais</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Software Engineering (Prof. Fábio Nogueira) e Avaliação Parcial MVP de Innovation Lab.
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-sky-500/10 border border-sky-500/30 text-xs">
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
                className="w-full mt-2 py-1.5 rounded-lg bg-[#182033] hover:bg-[#202b44] text-xs font-semibold text-slate-300 text-center transition-colors block cursor-pointer"
              >
                Abrir Central de Tarefas
              </button>
            </div>
          )}
        </div>

        {/* AI Quick Assistant Trigger */}
        <button
          onClick={() => setActiveTab('ai-assistant')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-900/60 to-purple-900/60 hover:from-indigo-800/80 hover:to-purple-800/80 border border-indigo-500/40 text-indigo-200 text-xs font-semibold transition-all shadow-sm shadow-indigo-500/10 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">IA Dicas</span>
        </button>

        {/* User Profile & Logout Button */}
        <div className="flex items-center gap-2 pl-2 border-l border-[#222b3d]">
          <div className="hidden lg:flex flex-col text-right">
            <span className="text-xs font-bold text-white leading-none">
              {currentUser?.name || studentName}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 font-medium">
              {currentUser?.course || 'Impacta 2026.2'}
            </span>
          </div>

          <button
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/25 hover:border-red-500/40 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
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
