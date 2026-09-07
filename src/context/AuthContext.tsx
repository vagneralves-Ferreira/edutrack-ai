import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  currentUser: User | null; // Adicionado para compatibilidade com o resto do app
  session: Session | null;
  loading: boolean;
  isLoading: boolean; // Adicionado para compatibilidade
  isAuthenticated: boolean; // Adicionado para compatibilidade
  signOut: () => Promise<void>;
  logout: () => Promise<void>; // Adicionado para compatibilidade
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Adicionamos as tipagens AuthChangeEvent e Session | null aqui para o TypeScript não reclamar
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  // Mapeamos os valores antigos para os nomes que o seu app já espera
  const value = {
    user,
    currentUser: user,
    session,
    loading,
    isLoading: loading,
    isAuthenticated: !!user,
    signOut,
    logout: signOut,
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