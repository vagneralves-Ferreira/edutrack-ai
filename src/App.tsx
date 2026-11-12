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
  const [isRecoveryFlow, setIsRecoveryFlow] = useState<boolean>(() => {
    const pathname = window.location.pathname || '';
    const hash = window.location.hash || '';
    const search = window.location.search || '';
    return (
      pathname.includes('reset-password') ||
      hash.includes('type=recovery') ||
      hash.includes('otp_expired') ||
      search.includes('type=recovery')
    );
  });

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryFlow(true);
        window.location.hash = '#/reset-password';
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
                <ResetPasswordView />
              ) : (
                <Routes>
                  {/* Public Authentication Screens */}
                  <Route path="/login" element={<LoginView />} />
                  <Route path="/cadastro" element={<RegisterView />} />
                  <Route path="/reset-password" element={<ResetPasswordView />} />

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
