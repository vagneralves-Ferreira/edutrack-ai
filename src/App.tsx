import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PlannerProvider, usePlanner } from './context/PlannerContext';
import { TimerProvider, useTimer } from './context/TimerContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { LoginView } from './views/LoginView';
import { RegisterView } from './views/RegisterView';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardView } from './views/DashboardView';
import { SubjectsView } from './views/SubjectsView';
import { TasksView } from './views/TasksView';
import { TimerView } from './views/TimerView';
import { AiAssistantView } from './views/AiAssistantView';
import { NewTaskModal } from './components/tasks/NewTaskModal';
import { 
  Menu, 
  X, 
  LayoutDashboard, 
  BookOpen, 
  CheckSquare, 
  Timer, 
  Sparkles,
  LogOut
} from 'lucide-react';
import type { ViewTab } from './types';

const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const { activeTab, setActiveTab, studentName } = usePlanner();
  const { currentUser, logout } = useAuth();
  const { isActive: isTimerActive, formattedTime } = useTimer();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    setMobileMenuOpen(false);
    logout();
    navigate('/login', { replace: true });
  };

  const navItems: { id: ViewTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: string; badgeColor?: string }[] = [
    { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'disciplinas', label: 'Disciplinas', icon: BookOpen },
    { id: 'tarefas', label: 'Tarefas & Prazos', icon: CheckSquare },
    { 
      id: 'timer', 
      label: 'Foco & Estudo', 
      icon: Timer,
      badge: isTimerActive ? formattedTime : undefined,
      badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/40 animate-pulse'
    },
    { id: 'ai-assistant', label: 'EduTrack AI Advisor', icon: Sparkles },
  ];

  return (
    <div className="min-h-screen bg-[#0a0d14] text-slate-100 flex flex-col md:flex-row antialiased">
      {/* Desktop Sidebar */}
      <div className="hidden md:block shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-[#0d111a] border-b border-[#1c2333] sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center text-slate-950 font-bold">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm text-white">
            EduTrack <span className="text-amber-400">AI</span>
          </span>
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg text-slate-400 hover:text-white bg-[#141926] border border-[#232d42]"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-14 z-50 bg-[#0b0e17]/95 backdrop-blur-md p-5 flex flex-col justify-between">
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">
              Navegação
            </p>
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
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                      : 'text-slate-300 hover:bg-[#141b2c]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-mono font-bold ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-[#121828] border border-[#1f283e] flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-white">{currentUser?.name || studentName}</p>
                <p className="text-[10px] text-slate-400">{currentUser?.email || 'Faculdade Impacta'}</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                title="Sair da Conta (Logout)"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sair</span>
              </button>
            </div>

            <div className="p-3 rounded-xl bg-[#0b0e17] border border-[#1c2438] text-[11px] text-slate-500 text-center">
              Faculdade Impacta Tecnologia • 2026.2
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <Header />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Routes>
            <Route path="/dashboard" element={<DashboardView />} />
            <Route path="/disciplinas" element={<SubjectsView />} />
            <Route path="/tarefas" element={<TasksView />} />
            <Route path="/timer" element={<TimerView />} />
            <Route path="/ai-assistant" element={<AiAssistantView />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>

      {/* New Task Modal (accessible globally) */}
      <NewTaskModal />
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PlannerProvider>
          <TimerProvider>
            <Routes>
              {/* Public Authentication Screens */}
              <Route path="/login" element={<LoginView />} />
              <Route path="/cadastro" element={<RegisterView />} />

              {/* Protected Academic Modules */}
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <MainLayout />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </TimerProvider>
        </PlannerProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

