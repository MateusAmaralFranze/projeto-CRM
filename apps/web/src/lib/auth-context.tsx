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
  // Usado no retorno do login com Google: já temos os tokens, falta buscar user/workspace via /me
  loginWithTokens: (accessToken: string, refreshToken: string) => Promise<void>;
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
        role: "owner",
        accessToken: data.accessToken,
        isLoading: false,
      });
    },
    [],
  );

  const loginWithTokens = useCallback(async (accessToken: string, refreshToken: string) => {
    localStorage.setItem(STORAGE_ACCESS_KEY, accessToken);
    localStorage.setItem(STORAGE_REFRESH_KEY, refreshToken);
    const data = await api.me(accessToken);
    setState({
      user: data.user,
      workspace: data.workspace,
      role: data.role,
      accessToken,
      isLoading: false,
    });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_ACCESS_KEY);
    localStorage.removeItem(STORAGE_REFRESH_KEY);
    setState({ user: null, workspace: null, role: null, accessToken: null, isLoading: false });
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider value={{ ...state, setSession, loginWithTokens, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa ser usado dentro de <AuthProvider>");
  return ctx;
}
