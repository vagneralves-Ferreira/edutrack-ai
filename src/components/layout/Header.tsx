import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  Clock,
  Sparkles, 
  AlertCircle,
  Edit2,
  Check,
  LogOut,
  LayoutDashboard,
  BookOpen,
  CheckSquare,
  Timer,
  Plus,
  Menu,
  X
} from 'lucide-react';
import { usePlanner } from '../../context/PlannerContext';
import { useAuth } from '../../context/AuthContext';
import { useTimer } from '../../context/TimerContext';
import type { ViewTab } from '../../types';

function formatShortTime(date = new Date()): string {
  const day = String(date.getDate()).padStart(2, '0');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day} ${months[date.getMonth()]} • ${hours}:${minutes}`;
}

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const { activeTab, setActiveTab, studentName, setStudentName, tasks, subjects, setIsNewTaskModalOpen } = usePlanner();
  const { currentUser, logout } = useAuth();
  const { isActive: isTimerActive, formattedTime } = useTimer();

  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(studentName);
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState<string>(() => formatShortTime());

  useEffect(() => {
    const interval = setInterval(() => setCurrentDateTime(formatShortTime()), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    setMobileMenuOpen(false);
    logout();
    navigate('/login', { replace: true });
  };

  const pendingTasksCount = tasks.filter(t => t.status !== 'completed').length;
  const criticalTasks = tasks.filter(t => t.status !== 'completed' && (t.isCriticalMvp || (t.type === 'avaliacao' && t.priority === 'critica')));

  const handleSaveName = () => {
    if (tempName.trim()) {
      setStudentName(tempName.trim());
    }
    setIsEditingName(false);
  };

  const navItems: { id: ViewTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: string | number; badgeColor?: string }[] = [
    { id: 'dashboard', label: 'Cockpit', icon: LayoutDashboard },
    { id: 'disciplinas', label: 'Disciplinas', icon: BookOpen, badge: subjects.length, badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
    { id: 'tarefas', label: 'Kanban & Prazos', icon: CheckSquare, badge: pendingTasksCount, badgeColor: 'bg-violet-500/20 text-violet-300 border-violet-500/30' },
    { 
      id: 'timer', 
      label: 'Pomodoro', 
      icon: Timer,
      badge: isTimerActive ? formattedTime : undefined,
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse font-mono'
    },
    { id: 'ai-assistant', label: 'AI Copilot', icon: Sparkles, badge: 'IA', badgeColor: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30' },
  ];

  return (
    <header className="sticky top-0 z-40 px-4 sm:px-6 lg:px-8 pt-3 pb-2">
      <div className="max-w-[1440px] mx-auto rounded-2xl bg-[#10111a]/85 backdrop-blur-2xl border border-white/[0.09] shadow-[0_12px_40px_-10px_rgba(0,0,0,0.7),inset_0_1px_0_0_rgba(255,255,255,0.08)] px-4 sm:px-5 h-16 flex items-center justify-between gap-4">
        
        {/* Left: Brand Identity + Impacta Pill */}
        <div className="flex items-center gap-3 shrink-0">
          <div 
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-500 to-cyan-400 p-[1px] shadow-lg shadow-violet-500/25">
              <div className="w-full h-full bg-[#090a10] rounded-[11px] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-cyan-400 group-hover:rotate-12 transition-transform" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm sm:text-base tracking-tight text-white">
                  EduTrack
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-gradient-to-r from-violet-600 to-cyan-500 text-white">
                  AI 2.0
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium hidden sm:block">
                Impacta • 2026.2
              </p>
            </div>
          </div>
        </div>

        {/* Center: Floating Segmented Navigation Pills (Desktop) */}
        <nav className="hidden lg:flex items-center gap-1 p-1 rounded-xl bg-black/40 border border-white/[0.06]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-600/25'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-300' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full border font-bold ${
                      isActive
                        ? 'bg-black/30 text-white border-white/20'
                        : item.badgeColor
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right: Actions, Clock, Notifications, User Profile */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Quick New Task Button */}
          <button
            onClick={() => setIsNewTaskModalOpen(true)}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white font-bold text-xs shadow-lg shadow-violet-500/20 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Nova Tarefa</span>
          </button>

          {/* Compact Clock */}
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.07] text-[11px] font-mono text-slate-300">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>{currentDateTime}</span>
          </div>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Avisos Acadêmicos"
            >
              <Bell className="w-4 h-4" />
              {criticalTasks.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-[#10111a]" />
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-[#12131f]/95 backdrop-blur-2xl border border-white/[0.12] shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.07]">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Radar de Avaliações</h4>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-semibold">{criticalTasks.length} críticos</span>
                </div>
                <div className="py-2.5 space-y-2 max-h-64 overflow-y-auto">
                  <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/25 text-xs">
                    <div className="flex items-center gap-1.5 text-violet-300 font-semibold mb-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>08/09: Avaliações Parciais</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      Software Engineering (Prof. Fábio Nogueira) e Avaliação Parcial MVP de Innovation Lab.
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/25 text-xs">
                    <div className="flex items-center gap-1.5 text-cyan-300 font-semibold mb-1">
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
                  className="w-full mt-2 py-2 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-xs font-semibold text-violet-200 text-center transition-colors block cursor-pointer"
                >
                  Abrir Kanban de Tarefas
                </button>
              </div>
            )}
          </div>

          {/* Student Profile + Editable Name + Logout */}
          <div className="hidden md:flex items-center gap-2 pl-2 border-l border-white/[0.08]">
            {isEditingName ? (
              <div className="flex items-center gap-1 bg-black/50 px-2 py-1 rounded-lg border border-violet-500/40">
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="bg-transparent text-white font-bold text-xs outline-none w-28"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                />
                <button onClick={handleSaveName} className="text-emerald-400 cursor-pointer">
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setTempName(studentName); setIsEditingName(true); }}
                className="flex items-center gap-2 px-2.5 py-1 rounded-xl hover:bg-white/[0.04] transition-colors group cursor-pointer"
                title="Clique para editar seu nome"
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-violet-500/30 to-cyan-500/30 border border-violet-400/30 flex items-center justify-center text-[11px] font-bold text-cyan-300">
                  {(currentUser?.name || studentName).slice(0, 2).toUpperCase()}
                </div>
                <span className="text-xs font-semibold text-slate-200 max-w-[110px] truncate">
                  {currentUser?.name || studentName}
                </span>
                <Edit2 className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            )}

            <button
              onClick={handleLogout}
              className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all cursor-pointer"
              title="Sair da Conta (Logout)"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mobile Menu Trigger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-300 hover:text-white cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden mt-2 rounded-2xl bg-[#10111a]/95 backdrop-blur-2xl border border-white/[0.1] p-4 space-y-2 shadow-2xl">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white'
                    : 'text-slate-300 hover:bg-white/[0.05]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
          <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between">
            <span className="text-xs text-slate-300 font-semibold">{currentUser?.name || studentName}</span>
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-lg bg-rose-500/15 text-rose-400 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
