import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
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
  X,
  Sun,
  Moon,
  BookMarked
} from 'lucide-react';
import { usePlanner } from '../../context/PlannerContext';
import { useAuth } from '../../context/AuthContext';
import { useTimer } from '../../context/TimerContext';
import { useTheme } from '../../context/ThemeContext';
import type { ViewTab } from '../../types';

function formatShortTime(date = new Date()): string {
  const day = String(date.getDate()).padStart(2, '0');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day} ${months[date.getMonth()]} • ${hours}:${minutes}`;
}

export function formatHeaderInstitutionLabel(
  isAuthenticated: boolean,
  institution?: string | null,
  semester?: string | null
): string {
  const sem = semester || '2026.2';
  if (!isAuthenticated) return 'Planner Acadêmico';
  const cleanInstitution = institution?.trim();
  return `${cleanInstitution || 'Planner Acadêmico'} • ${sem}`;
}

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeTab, setActiveTab, studentName, setStudentName, tasks, subjects, setIsNewTaskModalOpen, setIsClassroomModalOpen } = usePlanner();
  const { currentUser, isAuthenticated, logout, updateProfileName } = useAuth();
  const { isActive: isTimerActive, formattedTime } = useTimer();
  const { theme, toggleTheme } = useTheme();

  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(studentName);
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifPos, setNotifPos] = useState<{ top: number; right: number }>({ top: 76, right: 16 });
  const bellBtnRef = useRef<HTMLButtonElement | null>(null);
  const notifPanelRef = useRef<HTMLDivElement | null>(null);
  const [, setCurrentDateTime] = useState<string>(() => formatShortTime());

  useEffect(() => {
    const interval = setInterval(() => setCurrentDateTime(formatShortTime()), 1000);
    return () => clearInterval(interval);
  }, []);

  const computeNotifPos = () => {
    if (!bellBtnRef.current) return null;
    const rect = bellBtnRef.current.getBoundingClientRect();
    return {
      top: Math.round(rect.bottom + 8),
      right: Math.max(12, Math.round(window.innerWidth - rect.right)),
    };
  };

  const toggleNotifications = () => {
    if (!showNotifications) {
      const pos = computeNotifPos();
      if (pos) setNotifPos(pos);
    }
    setShowNotifications((prev) => !prev);
  };

  // Close the panel whenever the route changes.
  useEffect(() => {
    setShowNotifications(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!showNotifications) return;

    const updatePos = () => {
      const pos = computeNotifPos();
      if (pos) setNotifPos(pos);
    };

    window.addEventListener('resize', updatePos);
    window.addEventListener('scroll', updatePos, true);

    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        notifPanelRef.current?.contains(target) ||
        bellBtnRef.current?.contains(target)
      ) {
        return;
      }
      setShowNotifications(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('resize', updatePos);
      window.removeEventListener('scroll', updatePos, true);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showNotifications]);

  const handleLogout = () => {
    setMobileMenuOpen(false);
    logout();
    navigate('/login', { replace: true });
  };

  const pendingTasksCount = tasks.filter(t => t.status !== 'completed').length;
  const criticalTasks = tasks.filter(t => t.status !== 'completed' && (t.isCriticalMvp || (t.type === 'avaliacao' && t.priority === 'critica')));

  const handleSaveName = async () => {
    const name = tempName.trim();
    if (name && name !== currentUser?.name) {
      const result = await updateProfileName(name);
      if (!result.success) {
        window.alert(result.error);
        return;
      }
      setStudentName(name);
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
    <header className="top-header-backdrop sticky top-0 z-40 px-4 sm:px-6 lg:px-8 pt-3 pb-2 bg-[#07070b]/85 backdrop-blur-md">
      <div className="top-dock-shell max-w-[1440px] mx-auto rounded-2xl bg-[#10111a]/85 backdrop-blur-2xl border border-white/[0.09] shadow-[0_12px_40px_-10px_rgba(0,0,0,0.7),inset_0_1px_0_0_rgba(255,255,255,0.08)] px-3 sm:px-5 h-16 flex items-center justify-between gap-2 xl:gap-4 transition-all">
        
        {/* Left: Brand Identity + Institution Pill */}
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
              <p
                className="text-[10px] text-slate-400 font-medium hidden 2xl:block truncate max-w-[220px]"
                title={formatHeaderInstitutionLabel(isAuthenticated, currentUser?.institution, currentUser?.semester)}
              >
                {formatHeaderInstitutionLabel(isAuthenticated, currentUser?.institution, currentUser?.semester)}
              </p>
            </div>
          </div>
        </div>

        {/* Center: Floating Segmented Navigation Pills (Desktop) */}
        <nav className="top-dock-nav hidden lg:flex items-center gap-0.5 xl:gap-1 p-1 rounded-xl bg-black/40 border border-white/[0.06] shrink-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative flex items-center gap-1.5 px-2 xl:px-2.5 py-1.5 rounded-lg text-[11px] xl:text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-600/25'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-300' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span
                    className={`hidden 2xl:inline-flex text-[10px] px-1.5 py-0.2 rounded-full border font-bold ${
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

        {/* Right: Actions, Theme Toggle, Clock, Notifications, User Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* AVA / Portal Import Hub Button */}
          <button
            onClick={() => setIsClassroomModalOpen(true)}
            className="hidden md:flex items-center gap-1.5 px-2.5 2xl:px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-bold text-xs transition-all active:scale-95 cursor-pointer shrink-0"
            title="Importar Grade e Atividades"
          >
            <BookMarked className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden 2xl:inline">Importar</span>
          </button>

          {/* Quick New Task Button */}
          <button
            onClick={() => setIsNewTaskModalOpen(true)}
            className="hidden sm:flex items-center gap-1.5 px-2.5 2xl:px-3 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-white font-bold text-xs shadow-lg shadow-violet-500/20 transition-all active:scale-95 cursor-pointer shrink-0"
            title="Nova Tarefa"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden 2xl:inline">Nova Tarefa</span>
          </button>

          {/* Theme Toggle Button (Light / Dark Mode) */}
          <button
            onClick={toggleTheme}
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 hover:text-white transition-all cursor-pointer shrink-0"
            title={theme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-violet-600" />
            )}
          </button>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              ref={bellBtnRef}
              type="button"
              onClick={toggleNotifications}
              className="relative p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Avisos Acadêmicos"
              aria-expanded={showNotifications}
            >
              <Bell className="w-4 h-4" />
              {criticalTasks.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-[#10111a]" />
              )}
            </button>

            {showNotifications &&
              createPortal(
                // `.bento-card` is unlayered CSS (position: relative; overflow: hidden) and beats
                // Tailwind v4 layered utilities, so `fixed`/`overflow-y-auto` need `!` to apply.
                <div
                  ref={notifPanelRef}
                  role="dialog"
                  aria-label="Avisos Acadêmicos"
                  data-testid="notifications-panel"
                  style={{ top: notifPos.top, right: notifPos.right }}
                  className="bento-card !fixed z-50 w-80 max-w-[calc(100vw-24px)] max-h-96 !overflow-y-auto rounded-2xl shadow-2xl p-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-white/[0.07]">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Avisos & Pendentes</h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-semibold">
                      {pendingTasksCount} pendentes
                    </span>
                  </div>
                  <div className="py-2.5 space-y-2">
                    {pendingTasksCount === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-4">Nenhum aviso</p>
                    ) : (
                      tasks
                        .filter((t) => t.status !== 'completed')
                        .map((t) => (
                          <button
                            type="button"
                            key={t.id}
                            onClick={() => {
                              setShowNotifications(false);
                              navigate(`/tarefas?task=${encodeURIComponent(t.id)}`);
                            }}
                            className="w-full text-left p-2.5 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/25 text-xs transition-colors cursor-pointer block"
                          >
                            <div className="flex items-center justify-between gap-1.5 text-violet-300 font-semibold mb-1">
                              <span className="flex items-center gap-1.5 truncate">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">{t.title}</span>
                              </span>
                              <span className="font-mono text-[10px] text-cyan-300 shrink-0">
                                {t.dueDate.split('-').reverse().slice(0, 2).join('/')}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-300 leading-relaxed line-clamp-2">
                              {t.subjectName} • {t.description}
                            </p>
                          </button>
                        ))
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNotifications(false);
                      setActiveTab('tarefas');
                    }}
                    className="w-full mt-2 py-2 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-xs font-semibold text-violet-200 text-center transition-colors block cursor-pointer"
                  >
                    Abrir Kanban de Tarefas
                  </button>
                </div>,
                document.body
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleSaveName();
                    if (e.key === 'Escape') setIsEditingName(false);
                  }}
                  aria-label="Seu nome"
                />
                <button onClick={() => void handleSaveName()} className="text-emerald-400 cursor-pointer" aria-label="Salvar nome">
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setTempName(currentUser?.name || studentName); setIsEditingName(true); }}
                className="flex items-center gap-2 px-2.5 py-1 rounded-xl hover:bg-white/[0.04] transition-colors group cursor-pointer"
                title="Clique para editar seu nome"
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-violet-500/30 to-cyan-500/30 border border-violet-400/30 flex items-center justify-center text-[11px] font-bold text-cyan-300">
                  {(currentUser?.name || studentName).slice(0, 2).toUpperCase()}
                </div>
                <span className="hidden xl:inline text-xs font-semibold text-slate-200 max-w-[85px] 2xl:max-w-[110px] truncate">
                  {currentUser?.name || studentName}
                </span>
                <Edit2 className="hidden xl:inline w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            )}

            <button
              onClick={handleLogout}
              className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all cursor-pointer shrink-0"
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
        <div className="lg:hidden mt-2 rounded-2xl bento-card p-4 space-y-2 shadow-2xl">
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
