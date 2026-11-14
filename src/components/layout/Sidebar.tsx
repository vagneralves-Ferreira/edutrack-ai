import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BookOpen, 
  CheckSquare, 
  Timer, 
  Sparkles, 
  GraduationCap, 
  CalendarDays, 
  Plus,
  LogOut
} from 'lucide-react';
import { usePlanner } from '../../context/PlannerContext';
import { useAuth } from '../../context/AuthContext';
import { useTimer } from '../../context/TimerContext';
import type { ViewTab } from '../../types';

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const { activeTab, setActiveTab, tasks, subjects, studentName, setIsNewTaskModalOpen } = usePlanner();
  const { currentUser, logout } = useAuth();
  const { isActive: isTimerActive, formattedTime } = useTimer();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const pendingTasksCount = tasks.filter(t => t.status !== 'completed').length;
  const criticalMvpCount = tasks.filter(t => t.status !== 'completed' && t.isCriticalMvp).length;

  const navItems: { id: ViewTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: string | number; badgeColor?: string }[] = [
    { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'disciplinas', label: 'Disciplinas', icon: BookOpen, badge: subjects.length, badgeColor: 'bg-sky-500/15 text-sky-400 border-sky-500/25' },
    { id: 'tarefas', label: 'Tarefas & Prazos', icon: CheckSquare, badge: pendingTasksCount, badgeColor: criticalMvpCount > 0 ? 'bg-amber-500/15 text-amber-400 border-amber-500/25' : 'bg-white/[0.06] text-slate-300 border-white/[0.08]' },
    { 
      id: 'timer', 
      label: 'Foco & Estudo', 
      icon: Timer,
      badge: isTimerActive ? formattedTime : undefined,
      badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/40 animate-pulse font-mono'
    },
    { id: 'ai-assistant', label: 'EduTrack AI Advisor', icon: Sparkles, badge: 'IA', badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
  ];

  return (
    <aside className="w-64 bg-[#070a12]/90 backdrop-blur-2xl border-r border-white/[0.06] flex flex-col h-screen sticky top-0 select-none z-30 transition-all duration-300">
      {/* Brand Header */}
      <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 via-orange-500 to-indigo-600 p-[1px] shadow-lg shadow-amber-500/15 flex items-center justify-center">
            <div className="w-full h-full bg-[#090d18] rounded-[11px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base tracking-tight text-white font-sans">
                EduTrack <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">AI</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium tracking-wide">planner acadêmico</p>
          </div>
        </div>
      </div>

      {/* College Institution Badge */}
      <div className="px-4 pt-4 pb-2">
        <div className="px-3.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 shrink-0">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-200 truncate">{currentUser?.institution || 'Minha Faculdade'}</p>
            <p className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
              <span>{currentUser?.semester || 'Semestre 2026.2'}</span>
              <span className="w-1 h-1 rounded-full bg-emerald-400" />
              <span className="text-emerald-400 font-medium">{subjects.length} Ativas</span>
            </p>
          </div>
        </div>
      </div>

      {/* Quick Action Button */}
      <div className="px-4 py-2">
        <button
          onClick={() => setIsNewTaskModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-amber-500/15 active:scale-[0.98] cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Nova Tarefa / Entrega</span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        <p className="px-3 text-[10px] font-bold tracking-widest uppercase text-slate-500 mb-2">
          Menu Principal
        </p>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all group cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-amber-500/12 via-indigo-500/10 to-transparent text-white border border-white/[0.09] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03] border border-transparent'
              }`}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-gradient-to-b from-amber-400 to-orange-500" />
              )}
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-amber-400' : 'text-slate-500 group-hover:text-slate-300'
                  }`}
                />
                <span className={isActive ? 'font-semibold' : ''}>{item.label}</span>
              </div>

              {item.badge !== undefined && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${
                    item.badgeColor || 'bg-white/[0.05] text-slate-300 border-white/[0.08]'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Profile / Calendar Info & Logout */}
      <div className="p-3 border-t border-white/[0.06] bg-[#05070d]/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500/20 to-indigo-500/20 border border-amber-500/30 flex items-center justify-center text-xs font-bold text-amber-400 shrink-0">
            {(currentUser?.name || studentName)
              .split(' ')
              .filter(Boolean)
              .map((n: any) => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase() || 'AL'}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-200 truncate">
              {currentUser?.name || studentName}
            </p>
            <p className="text-[10px] text-slate-400 flex items-center gap-1 truncate">
              <CalendarDays className="w-3 h-3 text-slate-500 shrink-0" />
              <span className="truncate">{currentUser?.semester || 'Semestre 2026.2'}</span>
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 hover:border-rose-500/35 text-xs font-semibold transition-all cursor-pointer shrink-0 ml-1 flex items-center gap-1.5 active:scale-95"
          title="Sair da Conta (Logout)"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
};
