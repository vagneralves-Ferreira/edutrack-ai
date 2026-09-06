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
    { id: 'disciplinas', label: 'Disciplinas', icon: BookOpen, badge: subjects.length, badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    { id: 'tarefas', label: 'Tarefas & Prazos', icon: CheckSquare, badge: pendingTasksCount, badgeColor: criticalMvpCount > 0 ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-slate-800 text-slate-300' },
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
    <aside className="w-64 bg-[#0b0e17] border-r border-[#1e2538] flex flex-col h-screen sticky top-0 select-none z-30 transition-all duration-300">
      {/* Brand Header */}
      <div className="p-5 border-b border-[#1e2538]/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-orange-600 to-indigo-600 p-[1px] shadow-lg shadow-amber-500/10 flex items-center justify-center">
            <div className="w-full h-full bg-[#0d121f] rounded-[11px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base tracking-tight text-white font-sans">
                EduTrack <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">AI</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">planner acadêmico</p>
          </div>
        </div>
      </div>

      {/* College Institution Badge */}
      <div className="px-4 pt-4 pb-2">
        <div className="px-3 py-2 rounded-lg bg-[#121826] border border-[#222b40] flex items-center gap-2.5">
          <GraduationCap className="w-4 h-4 text-sky-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-200 truncate">Faculdade Impacta</p>
            <p className="text-[10px] text-slate-400 flex items-center gap-1">
              <span>Semestre 2026.2</span>
              <span>•</span>
              <span className="text-emerald-400 font-medium">5 Ativas</span>
            </p>
          </div>
        </div>
      </div>

      {/* Quick Action Button */}
      <div className="px-4 py-2">
        <button
          onClick={() => setIsNewTaskModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-semibold text-xs transition-all shadow-md shadow-amber-500/15 active:scale-[0.98] cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Tarefa / Entrega</span>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-1.5 overflow-y-auto">
        <p className="px-3 text-[10px] font-semibold tracking-wider uppercase text-slate-400 mb-2">
          Navegação Principal
        </p>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all group cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-[#172033] to-[#121929] text-white border border-[#2a3754] shadow-sm shadow-blue-500/5'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#121826]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-amber-400' : 'text-slate-500 group-hover:text-slate-300'
                  }`}
                />
                <span>{item.label}</span>
              </div>

              {item.badge !== undefined && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${
                    item.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'
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
      <div className="p-3 border-t border-[#1e2538]/80 bg-[#090c14] flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-xs font-bold text-amber-400 shrink-0">
            {(currentUser?.name || studentName)
              .split(' ')
              .filter(Boolean)
              .map(n => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase() || 'AL'}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-200 truncate">
              {currentUser?.name || studentName}
            </p>
            <p className="text-[10px] text-slate-400 flex items-center gap-1 truncate">
              <CalendarDays className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="truncate">{currentUser?.semester || 'Semestre 2026.2'}</span>
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 text-xs font-semibold transition-all cursor-pointer shrink-0 ml-1 flex items-center gap-1.5 shadow-sm active:scale-95"
          title="Sair da Conta (Logout)"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
};
