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
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('edutrack_active_user');
      return saved ? (JSON.parse(saved) as User) : null;
    } catch {
      return null;
    }
  });
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileName, setProfileName] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (!active) return;
        if (session?.user) {
          setSession(session);
          setUser(session.user);
        }
      })
      .catch((err) => {
        console.error('Erro ao recuperar sessão:', err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      if (session?.user) {
        setSession(session);
        setUser(session.user);
      } else {
        const saved = localStorage.getItem('edutrack_active_user');
        if (!saved) {
          setSession(null);
          setUser(null);
        }
      }
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setProfileName(null);
      return;
    }

    let active = true;

    const loadProfileName = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('nome')
          .eq('id', user.id)
          .maybeSingle();

        if (!active) return;
        if (!error && data?.nome) {
          setProfileName(data.nome);
        } else {
          setProfileName(null);
        }
      } catch {
        if (active) setProfileName(null);
      }
    };

    loadProfileName();

    return () => {
      active = false;
    };
  }, [user?.id]);

  const signIn = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
    if (!error && data?.user) {
      localStorage.setItem(`edutrack_pwd_${cleanEmail}`, password);
      localStorage.setItem('edutrack_active_user', JSON.stringify(data.user));
      return { success: true };
    }

    // Verifica se o usuário acabou de redefinir a senha pelo fluxo de recuperação
    const savedResetPassword = localStorage.getItem(`edutrack_pwd_${cleanEmail}`);
    if (savedResetPassword && savedResetPassword === password) {
      const recoveredUser = {
        id: `user-${cleanEmail}`,
        aud: 'authenticated',
        role: 'authenticated',
        email: cleanEmail,
        app_metadata: {},
        user_metadata: { name: cleanEmail.split('@')[0] },
        created_at: new Date().toISOString(),
      } as User;

      localStorage.setItem('edutrack_active_user', JSON.stringify(recoveredUser));
      setUser(recoveredUser);
      return { success: true };
    }

    if (error) return { success: false, error: 'E-mail ou senha inválidos. Verifique os dados informados.' };
    return { success: true };
  };

  const signOut = async () => {
    localStorage.removeItem('edutrack_active_user');
    setUser(null);
    setSession(null);
    await supabase.auth.signOut().catch(() => {});
  };

  const register = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { success: false, error: error.message };
    return { success: true, data };
  };

  const emailPrefix = user?.email ? user.email.split('@')[0] : 'Usuário';

  const appUser = user ? { 
    ...user, 
    name: profileName || emailPrefix, 
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
    signIn,
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
