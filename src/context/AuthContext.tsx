import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type AppUser = User & {
  name?: string;
  course?: string;
  semester?: string;
};

interface AuthContextType {
  user: User | null;
  currentUser: AppUser | null;
  session: Session | null;
  loading: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (!active) return;
        setSession(session);
        setUser(session?.user ?? null);
      })
      .catch((err) => {
        console.error('Erro ao recuperar sessão:', err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const register = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { success: false, error: error.message };
    return { success: true, data };
  };
  
  const appUser = user ? { 
    ...user, 
    name: 'Usuário', 
    course: 'Curso', 
    semester: '1º Semestre' 
  } as AppUser : null;

  const value = {
    user,
    currentUser: appUser,
    session,
    loading,
    isLoading: loading,
    isAuthenticated: !!user,
    signOut,
    logout: signOut,
    register,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};