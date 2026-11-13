import { ResetPasswordView } from './views/ResetPasswordView';
import React, { useEffect, useState, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PlannerProvider } from './context/PlannerContext';
import { TimerProvider } from './context/TimerContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { LoginView } from './views/LoginView';
import { RegisterView } from './views/RegisterView';
import { Header } from './components/layout/Header';
import { DashboardView } from './views/DashboardView';
import { SubjectsView } from './views/SubjectsView';
import { TasksView } from './views/TasksView';
import { TimerView } from './views/TimerView';
import { AiAssistantView } from './views/AiAssistantView';
import { NewTaskModal } from './components/tasks/NewTaskModal';
import { ClassroomSyncModal } from './components/classroom/ClassroomSyncModal';
import { supabase } from './lib/supabase';
import { Layers } from 'lucide-react';

// Captura os parâmetros da URL antes do HashRouter modificar o hash
const INITIAL_PATHNAME = window.location.pathname || '';
const INITIAL_HASH = window.location.hash || '';
const INITIAL_SEARCH = window.location.search || '';

function parseHashParams(hashStr: string): URLSearchParams {
  const cleaned = hashStr.replace(/^#\/?/, '');
  const queryStart = cleaned.indexOf('?');
  if (queryStart !== -1) {
    return new URLSearchParams(cleaned.slice(queryStart + 1));
  }
  return new URLSearchParams(cleaned);
}

const INITIAL_HASH_PARAMS = parseHashParams(INITIAL_HASH);
const INITIAL_SEARCH_PARAMS = new URLSearchParams(INITIAL_SEARCH);

const IS_INITIAL_RECOVERY =
  INITIAL_PATHNAME.includes('reset-password') ||
  INITIAL_HASH.includes('reset-password') ||
  INITIAL_HASH.includes('type=recovery') ||
  INITIAL_HASH.includes('otp_expired') ||
  INITIAL_SEARCH.includes('type=recovery');

const COCKPIT_SCREENS = [
  { path: '/dashboard', label: 'Cockpit Acadêmico', element: <DashboardView /> },
  { path: '/disciplinas', label: 'Disciplinas • 2026.2', element: <SubjectsView /> },
  { path: '/tarefas', label: 'Kanban & Prazos', element: <TasksView /> },
  { path: '/timer', label: 'Timer Pomodoro', element: <TimerView /> },
  { path: '/ai-assistant', label: 'AI Copilot • Gemini', element: <AiAssistantView /> },
];

const MainLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const currentIdx = Math.max(
    0,
    COCKPIT_SCREENS.findIndex((s) => location.pathname.startsWith(s.path))
  );
  const currentScreen = COCKPIT_SCREENS[currentIdx] || COCKPIT_SCREENS[0];
  const nextScreen1 = COCKPIT_SCREENS[(currentIdx + 1) % COCKPIT_SCREENS.length];
  const nextScreen2 = COCKPIT_SCREENS[(currentIdx + 2) % COCKPIT_SCREENS.length];

  const [exitingScreen, setExitingScreen] = useState<{
    key: string;
    element: React.ReactNode;
  } | null>(null);
  const prevIdxRef = useRef<number>(currentIdx);

  useEffect(() => {
    if (prevIdxRef.current !== currentIdx) {
      const prev = COCKPIT_SCREENS[prevIdxRef.current];
      if (prev) {
        setExitingScreen({ key: `${prev.path}-${Date.now()}`, element: prev.element });
      }
      prevIdxRef.current = currentIdx;
      const timer = setTimeout(() => {
        setExitingScreen(null);
      }, 420);
      return () => clearTimeout(timer);
    }
  }, [currentIdx]);

  return (
    <div className="min-h-screen bg-transparent text-slate-100 flex flex-col antialiased">
      {/* Top Floating Command Bar */}
      <Header />

      {/* Full-Width Bento Cockpit Workspace with 3D Stacked Screens */}
      <main className="flex-1 px-4 sm:px-6 lg:px-8 pt-8 pb-6 max-w-[1440px] w-full mx-auto">
        <div className="screen-stack-stage">
          {/* Camada 2 de fundo (segunda tela atrás) */}
          <div
            onClick={() => navigate(nextScreen2.path)}
            title={`Trazer "${nextScreen2.label}" para frente`}
            className="screen-deck-layer-2 !pointer-events-auto cursor-pointer flex items-start justify-between px-6 pt-1.5 opacity-75 hover:opacity-100 hover:-translate-y-[26px] transition-all"
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300/80 flex items-center gap-1.5">
              <Layers className="w-3 h-3" />
              {nextScreen2.label}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">2ª na pilha • clique para abrir</span>
          </div>

          {/* Camada 1 de fundo (primeira tela imediatamente atrás) */}
          <div
            onClick={() => navigate(nextScreen1.path)}
            title={`Trazer "${nextScreen1.label}" para frente`}
            className="screen-deck-layer-1 !pointer-events-auto cursor-pointer flex items-start justify-between px-6 pt-1.5 opacity-90 hover:opacity-100 hover:-translate-y-[15px] transition-all"
          >
            <span className="text-[10px] font-bold uppercase tracking-wider text-violet-300 flex items-center gap-1.5">
              <Layers className="w-3 h-3" />
              Próxima atrás: {nextScreen1.label}
            </span>
            <span className="text-[10px] text-slate-300 font-medium">Clique para puxar para frente →</span>
          </div>

          {/* Tela saindo pela frente durante a troca */}
          {exitingScreen && (
            <div key={exitingScreen.key} className="screen-exit-front">
              <div className="bento-card rounded-3xl p-4 sm:p-6 border-violet-500/20">
                {exitingScreen.element}
              </div>
            </div>
          )}

          {/* Tela ativa emergindo de trás */}
          <div
            key={currentScreen.path}
            className="relative z-10 screen-emerge-behind bento-card rounded-3xl p-4 sm:p-6 border-violet-500/25 shadow-2xl"
          >
            <Routes>
              <Route path="/dashboard" element={<DashboardView />} />
              <Route path="/disciplinas" element={<SubjectsView />} />
              <Route path="/tarefas" element={<TasksView />} />
              <Route path="/timer" element={<TimerView />} />
              <Route path="/ai-assistant" element={<AiAssistantView />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </div>
      </main>

      {/* New Task & Classroom Sync Modals (accessible globally) */}
      <NewTaskModal />
      <ClassroomSyncModal />
    </div>
  );
};

export default function App() {
  const [isRecoveryFlow, setIsRecoveryFlow] = useState<boolean>(IS_INITIAL_RECOVERY);

  useEffect(() => {
    // Se a URL inicial veio do link de e-mail do Supabase com access_token e refresh_token, hidrata a sessão imediatamente
    const accessToken = INITIAL_HASH_PARAMS.get('access_token');
    const refreshToken = INITIAL_HASH_PARAMS.get('refresh_token');
    const code = INITIAL_SEARCH_PARAMS.get('code');
    const tokenHash = INITIAL_SEARCH_PARAMS.get('token_hash') || INITIAL_HASH_PARAMS.get('token_hash');

    if (accessToken && refreshToken) {
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    } else if (code) {
      supabase.auth.exchangeCodeForSession(code);
    } else if (tokenHash) {
      supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'recovery',
      });
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryFlow(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <ThemeProvider>
      <HashRouter>
        <AuthProvider>
          <PlannerProvider>
            <TimerProvider>
              {isRecoveryFlow ? (
                <ResetPasswordView
                  initialExpired={
                    INITIAL_HASH.includes('otp_expired') || INITIAL_SEARCH.includes('otp_expired')
                  }
                  onFinishRecovery={() => setIsRecoveryFlow(false)}
                />
              ) : (
                <Routes>
                  {/* Public Authentication Screens */}
                  <Route path="/login" element={<LoginView />} />
                  <Route path="/cadastro" element={<RegisterView />} />
                  <Route
                    path="/reset-password"
                    element={<ResetPasswordView onFinishRecovery={() => setIsRecoveryFlow(false)} />}
                  />

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
              )}
            </TimerProvider>
          </PlannerProvider>
        </AuthProvider>
      </HashRouter>
    </ThemeProvider>
  );
}
