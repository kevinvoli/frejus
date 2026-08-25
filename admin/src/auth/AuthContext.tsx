import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  apiFetch,
  clearToken,
  getToken,
  setToken as persistToken,
  setUnauthorizedHandler,
} from '../api/client';

interface AuthUser {
  id: number;
  email: string;
}

interface LoginResponse {
  access_token: string;
  user: AuthUser;
}

interface AuthContextValue {
  token: string | null;
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => getToken());
  const [user, setUser] = useState<AuthUser | null>(null);

  // Réagit à un 401 déclenché n'importe où dans l'app (token expiré/invalide) :
  // on nettoie l'état local, RequireAuth renverra alors vers /login.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setTokenState(null);
      setUser(null);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  async function login(email: string, password: string): Promise<void> {
    const result = await apiFetch<LoginResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    persistToken(result.access_token);
    setTokenState(result.access_token);
    setUser(result.user);
  }

  function logout(): void {
    clearToken();
    setTokenState(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth doit être utilisé à l\'intérieur d\'un <AuthProvider>');
  }
  return ctx;
}
