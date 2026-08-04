const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3333";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message = data?.message ?? "Erro inesperado. Tente novamente.";
    throw new ApiError(Array.isArray(message) ? message.join(", ") : message, res.status);
  }

  return data as T;
}

// ==========================================
// TIPOS
// ==========================================
export type AuthUser = { id: string; name: string; email: string };
export type AuthWorkspace = { id: string; name: string; slug: string };

export type SignupInput = {
  workspaceName: string;
  userName: string;
  email: string;
  password: string;
};

export type LoginInput = { email: string; password: string };

export type SingleWorkspaceAuthResult = {
  requiresWorkspaceSelection: false;
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  workspace: AuthWorkspace;
};

export type MultiWorkspaceAuthResult = {
  requiresWorkspaceSelection: true;
  preAuthToken: string;
  workspaces: (AuthWorkspace & { role: string })[];
};

export type SignupResult = Omit<SingleWorkspaceAuthResult, "requiresWorkspaceSelection">;

// ==========================================
// ENDPOINTS
// ==========================================
export const api = {
  signup: (input: SignupInput) =>
    request<SignupResult>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  login: (input: LoginInput) =>
    request<SingleWorkspaceAuthResult | MultiWorkspaceAuthResult>("/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  selectWorkspace: (preAuthToken: string, workspaceId: string) =>
    request<SingleWorkspaceAuthResult>("/auth/select-workspace", {
      method: "POST",
      body: JSON.stringify({ preAuthToken, workspaceId }),
    }),

  me: (accessToken: string) =>
    request<{ user: AuthUser & { twoFactorEnabled: boolean }; workspace: AuthWorkspace; role: string }>(
      "/auth/me",
      { headers: { Authorization: `Bearer ${accessToken}` } },
    ),

  refresh: (refreshToken: string) =>
    request<{ accessToken: string; refreshToken: string }>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    }),
};
