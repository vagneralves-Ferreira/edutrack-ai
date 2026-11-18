import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type AppUser = User & {
  name?: string;
  institution?: string;
  course?: string;
  semester?: string;
};

interface RegisterMetadata {
  name?: string;
  institution?: string;
  course?: string;
  semester?: string;
}

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
  register: (email: string, password: string, metadata?: RegisterMetadata) => Promise<any>;
  /** True when the user has a real name (profiles.nome or signup metadata), not just the e-mail prefix. */
  hasProfileName: boolean;
  /** Saves the display name to public.profiles.nome for the signed-in user. */
  updateProfileName: (name: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** One-time cleanup of legacy offline-auth and plaintext-password localStorage keys. */
function cleanupLegacyAuthStorage(): void {
  if (localStorage.getItem('edutrack_auth_cleanup_v1') === 'done') return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (
        k === 'edutrack_active_user' ||
        k.startsWith('edutrack_pwd_') ||
        k.startsWith('edutrack_supabase_pwd_') ||
        k.startsWith('edutrack_user_meta_') ||
        k.includes('user-lucas.mendes')
      ) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    localStorage.setItem('edutrack_auth_cleanup_v1', 'done');
  } catch {
    // ignore storage errors
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileName, setProfileName] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    cleanupLegacyAuthStorage();

    const initSession = async () => {
      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();

        if (!active) return;

        if (!currentSession) {
          setSession(null);
          setUser(null);
          return;
        }

        // Verify the user still exists on the Supabase Auth server (handles deleted accounts)
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (!active) return;

        if (userError || !userData?.user) {
          await supabase.auth.signOut().catch(() => {});
          setSession(null);
          setUser(null);
          return;
        }

        setSession(currentSession);
        setUser(userData.user);
      } catch (err) {
        console.error('Erro ao recuperar sessão:', err);
        if (active) {
          setSession(null);
          setUser(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, nextSession: Session | null) => {
      if (!active) return;
      if (nextSession?.user) {
        setSession(nextSession);
        setUser(nextSession.user);
      } else {
        setSession(null);
        setUser(null);
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

    void loadProfileName();

    return () => {
      active = false;
    };
  }, [user?.id]);

  const signIn = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error || !data?.user) {
      return {
        success: false,
        error: 'E-mail ou senha inválidos. Verifique os dados informados.',
      };
    }

    setUser(data.user);
    if (data.session) setSession(data.session);
    return { success: true };
  };

  const signOut = async () => {
    setUser(null);
    setSession(null);
    setProfileName(null);
    await supabase.auth.signOut().catch(() => {});
  };

  const register = async (email: string, password: string, metadata?: RegisterMetadata) => {
    const cleanEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: metadata ? { data: metadata } : undefined,
    });
    if (error) return { success: false, error: error.message };
    return { success: true, data };
  };

  const updateProfileName = async (name: string): Promise<{ success: boolean; error?: string }> => {
    const cleanName = name.trim();
    if (!user?.id) return { success: false, error: 'Sessão expirada. Faça login novamente.' };
    if (!cleanName) return { success: false, error: 'Informe um nome.' };

    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, nome: cleanName }, { onConflict: 'id' });
    if (error) return { success: false, error: 'Não foi possível salvar o nome. Tente novamente.' };

    setProfileName(cleanName);
    return { success: true };
  };

  const emailPrefix = user?.email ? user.email.split('@')[0] : 'Usuário';
  const cleanUserEmail = user?.email?.toLowerCase() || '';
  const supaMeta = (user?.user_metadata || {}) as RegisterMetadata;
  // Older builds stored the e-mail prefix in profiles.nome; treat that as "no name".
  const isRealName = (value?: string | null): value is string =>
    !!value && !!value.trim() && value.trim().toLowerCase() !== emailPrefix.toLowerCase();
  const realName = isRealName(profileName) ? profileName.trim() : isRealName(supaMeta.name) ? supaMeta.name.trim() : null;
  const resolvedInstitution =
    supaMeta.institution ||
    (cleanUserEmail.includes('impacta.edu') ? 'Faculdade Impacta' : 'Minha Faculdade');

  const appUser = user
    ? ({
        ...user,
        name: realName || emailPrefix,
        institution: resolvedInstitution,
        course: supaMeta.course || 'Graduação',
        semester: supaMeta.semester || '2026.2',
      } as AppUser)
    : null;

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
    hasProfileName: !!realName,
    updateProfileName,
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
