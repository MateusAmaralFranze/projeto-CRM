"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { api, AuthUser, AuthWorkspace } from "./api-client";

type AuthState = {
  user: AuthUser | null;
  workspace: AuthWorkspace | null;
  role: string | null;
  accessToken: string | null;
  isLoading: boolean;
};

type AuthContextValue = AuthState & {
  setSession: (data: {
    accessToken: string;
    refreshToken: string;
    user: AuthUser;
    workspace: AuthWorkspace;
  }) => void;
  logout: () => void;
};

const STORAGE_ACCESS_KEY = "adtrack_access_token";
const STORAGE_REFRESH_KEY = "adtrack_refresh_token";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user: null,
    workspace: null,
    role: null,
    accessToken: null,
    isLoading: true,
  });

  // Ao carregar a página, tenta restaurar a sessão a partir do token salvo
  useEffect(() => {
    const accessToken = localStorage.getItem(STORAGE_ACCESS_KEY);

    if (!accessToken) {
      setState((s) => ({ ...s, isLoading: false }));
      return;
    }

    api
      .me(accessToken)
      .then((data) => {
        setState({
          user: data.user,
          workspace: data.workspace,
          role: data.role,
          accessToken,
          isLoading: false,
        });
      })
      .catch(() => {
        // token expirado/inválido -> limpa e trata como deslogado
        localStorage.removeItem(STORAGE_ACCESS_KEY);
        localStorage.removeItem(STORAGE_REFRESH_KEY);
        setState((s) => ({ ...s, isLoading: false }));
      });
  }, []);

  const setSession = useCallback(
    (data: {
      accessToken: string;
      refreshToken: string;
      user: AuthUser;
      workspace: AuthWorkspace;
    }) => {
      localStorage.setItem(STORAGE_ACCESS_KEY, data.accessToken);
      localStorage.setItem(STORAGE_REFRESH_KEY, data.refreshToken);
      setState({
        user: data.user,
        workspace: data.workspace,
        role: "owner", // refinamos isso quando tivermos convite de membros (bloco 3)
        accessToken: data.accessToken,
        isLoading: false,
      });
    },
    [],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_ACCESS_KEY);
    localStorage.removeItem(STORAGE_REFRESH_KEY);
    setState({ user: null, workspace: null, role: null, accessToken: null, isLoading: false });
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider value={{ ...state, setSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa ser usado dentro de <AuthProvider>");
  return ctx;
}
