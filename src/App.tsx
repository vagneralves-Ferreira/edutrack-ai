import { ResetPasswordView } from './views/ResetPasswordView';
import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import { supabase } from './lib/supabase';

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

const MainLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-transparent text-slate-100 flex flex-col antialiased">
      {/* Top Floating Command Bar */}
      <Header />

      {/* Full-Width Bento Cockpit Workspace */}
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-5 max-w-[1440px] w-full mx-auto">
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

      {/* New Task Modal (accessible globally) */}
      <NewTaskModal />
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
