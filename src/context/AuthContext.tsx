import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, LoginCredentials, RegisterData } from '../types';
import confetti from 'canvas-confetti';

interface AuthContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  demoCredentials: { email: string; password: string };
}

const DEFAULT_USERS: User[] = [
  {
    id: 'usr-impacta-1',
    name: 'Alexandre (Impacta)',
    email: 'alexandre@impacta.edu.br',
    password: 'impacta2026',
    semester: '4º Semestre',
    course: 'Análise e Desenvolvimento de Sistemas',
    institution: 'Faculdade Impacta Tecnologia',
    createdAt: '2026-08-01',
  },
  {
    id: 'usr-impacta-2',
    name: 'Mariana Costa',
    email: 'mariana.costa@impacta.edu.br',
    password: 'impacta2026',
    semester: '2º Semestre',
    course: 'Engenharia de Software',
    institution: 'Faculdade Impacta Tecnologia',
    createdAt: '2026-08-10',
  }
];

const STORAGE_KEYS = {
  USERS: 'edutrack_registered_users_v1',
  SESSION: 'edutrack_auth_session_v1',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USERS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error loading users from localStorage', e);
      }
    }
    return DEFAULT_USERS;
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedSession = localStorage.getItem(STORAGE_KEYS.SESSION);
    if (savedSession) {
      try {
        return JSON.parse(savedSession);
      } catch (e) {
        console.error('Error loading session from localStorage', e);
      }
    }
    // Default to initial user logged in for immediate usability, or null if logged out
    return DEFAULT_USERS[0];
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Sync users to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }, [users]);

  // Sync active session to localStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(currentUser));
      localStorage.setItem('edutrack_student_name_v1', currentUser.name);
    } else {
      localStorage.removeItem(STORAGE_KEYS.SESSION);
    }
  }, [currentUser]);

  const login = async (credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);

    // Simulate natural authentication network delay (400ms)
    await new Promise((resolve) => setTimeout(resolve, 400));

    const normalizedEmail = credentials.email.trim().toLowerCase();
    const userFound = users.find(u => u.email.toLowerCase() === normalizedEmail);

    if (!userFound || userFound.password !== credentials.password) {
      setIsLoading(false);
      return {
        success: false,
        error: 'Senha inválida ou usuário não encontrado'
      };
    }

    setCurrentUser(userFound);
    setIsLoading(false);
    return { success: true };
  };

  const register = async (data: RegisterData): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 450));

    const normalizedEmail = data.email.trim().toLowerCase();

    // Check if user already exists
    if (users.some(u => u.email.toLowerCase() === normalizedEmail)) {
      setIsLoading(false);
      return {
        success: false,
        error: 'Já existe um cadastro acadêmico com este e-mail institucional.'
      };
    }

    const newUser: User = {
      id: 'usr-' + Date.now(),
      name: data.name.trim(),
      email: normalizedEmail,
      password: data.password,
      course: data.course.trim(),
      semester: data.semester.trim(),
      institution: 'Faculdade Impacta Tecnologia',
      createdAt: new Date().toISOString()
    };

    setUsers(prev => [newUser, ...prev]);
    setCurrentUser(newUser);

    try {
      confetti({
        particleCount: 80,
        spread: 75,
        origin: { y: 0.6 }
      });
    } catch (e) {
      // ignore
    }

    setIsLoading(false);
    return { success: true };
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(STORAGE_KEYS.SESSION);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        isLoading,
        login,
        register,
        logout,
        demoCredentials: {
          email: 'alexandre@impacta.edu.br',
          password: 'impacta2026'
        }
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
