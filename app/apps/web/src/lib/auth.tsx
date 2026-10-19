import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { UserSummary } from "@teamroom/shared";
import { api, ApiError } from "./api";

interface AuthState {
  user: UserSummary | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const qc = useQueryClient();

  useEffect(() => {
    api
      .get<UserSummary>("/api/auth/me")
      .then(setUser)
      .catch((e) => {
        if (!(e instanceof ApiError && (e.status === 401 || e.status === 403))) console.error(e);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const u = await api.post<UserSummary>("/api/auth/login", { email, password });
      qc.clear();
      setUser(u);
    },
    [qc],
  );

  const logout = useCallback(async () => {
    await api.post("/api/auth/logout");
    qc.clear();
    setUser(null);
  }, [qc]);

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
}
