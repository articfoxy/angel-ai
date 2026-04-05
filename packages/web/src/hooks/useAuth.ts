import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { api } from '../services/api';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function useAuthProvider(): AuthContextValue {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('angel_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem('angel_token')
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      api
        .getProfile()
        .then((u) => {
          setUser(u);
          localStorage.setItem('angel_user', JSON.stringify(u));
        })
        .catch(() => {
          // Token invalid — clear auth
          setUser(null);
          setToken(null);
          localStorage.removeItem('angel_token');
          localStorage.removeItem('angel_user');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login(email, password);
    localStorage.setItem('angel_token', res.token);
    localStorage.setItem('angel_user', JSON.stringify(res.user));
    setToken(res.token);
    setUser(res.user);
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const res = await api.register(name, email, password);
      localStorage.setItem('angel_token', res.token);
      localStorage.setItem('angel_user', JSON.stringify(res.user));
      setToken(res.token);
      setUser(res.user);
    },
    []
  );

  const logout = useCallback(() => {
    localStorage.removeItem('angel_token');
    localStorage.removeItem('angel_user');
    setToken(null);
    setUser(null);
  }, []);

  return { user, token, loading, login, register, logout };
}

// Re-export for convenient use
export { createContext };
export type { ReactNode };
