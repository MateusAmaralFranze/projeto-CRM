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

function authHeader(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}` };
}

// ==========================================
// TIPOS — AUTH
// ==========================================
export type AuthUser = { id: string; name: string; email: string };
export type AuthWorkspace = { id: string; name: string; slug: string };
export type WorkspaceChoice = AuthWorkspace & { role: string };

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
  workspaces: WorkspaceChoice[];
};

export type LoginResult =
  | { requires2FA: true; twoFaToken: string }
  | ({ requires2FA: false } & (SingleWorkspaceAuthResult | MultiWorkspaceAuthResult));

export type SignupResult = Omit<SingleWorkspaceAuthResult, "requiresWorkspaceSelection">;

export type MemberSummary = {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  status: "active" | "pending";
  invitedAt: string | null;
  joinedAt: string | null;
};

export type InviteResult =
  | { status: "added"; message: string }
  | { status: "invited"; inviteToken: string; inviteUrl: string };

// ==========================================
// TIPOS — CHECKOUT (Etapa 5)
// ==========================================
export type CheckoutConnection = {
  id: string;
  platform: string;
  label: string | null;
  status: string;
  createdAt: string;
};

export type CreateConnectionResult = {
  id: string;
  platform: string;
  label: string | null;
  webhookUrl: string;
  webhookSecret: string;
  createdAt: string;
};

export type SaleSummary = {
  id: string;
  externalId: string;
  status: string;
  amountCents: number;
  productName: string | null;
  utmSource: string | null;
  utmCampaign: string | null;
  createdAt: string;
};

// ==========================================
// ENDPOINTS
// ==========================================
export const api = {
  // ---- Auth ----
  signup: (input: SignupInput) =>
    request<SignupResult>("/auth/signup", { method: "POST", body: JSON.stringify(input) }),

  login: (input: LoginInput) =>
    request<LoginResult>("/auth/login", { method: "POST", body: JSON.stringify(input) }),

  verifyLoginTwoFactor: (twoFaToken: string, code: string) =>
    request<SingleWorkspaceAuthResult | MultiWorkspaceAuthResult>("/auth/2fa/verify-login", {
      method: "POST",
      body: JSON.stringify({ twoFaToken, code }),
    }),

  selectWorkspace: (preAuthToken: string, workspaceId: string) =>
    request<SingleWorkspaceAuthResult>("/auth/select-workspace", {
      method: "POST",
      body: JSON.stringify({ preAuthToken, workspaceId }),
    }),

  getWorkspacesForPreAuthToken: (token: string) =>
    request<WorkspaceChoice[]>(`/auth/pre-auth/workspaces?token=${encodeURIComponent(token)}`),

  me: (accessToken: string) =>
    request<{ user: AuthUser & { twoFactorEnabled: boolean }; workspace: AuthWorkspace; role: string }>(
      "/auth/me",
      { headers: authHeader(accessToken) },
    ),

  refresh: (refreshToken: string) =>
    request<{ accessToken: string; refreshToken: string }>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    }),

  // ---- 2FA ----
  setupTwoFactor: (accessToken: string) =>
    request<{ secret: string; qrCodeDataUrl: string }>("/auth/2fa/setup", {
      method: "POST",
      headers: authHeader(accessToken),
    }),

  enableTwoFactor: (accessToken: string, code: string) =>
    request<{ success: true }>("/auth/2fa/enable", {
      method: "POST",
      headers: authHeader(accessToken),
      body: JSON.stringify({ code }),
    }),

  disableTwoFactor: (accessToken: string, code: string) =>
    request<{ success: true }>("/auth/2fa/disable", {
      method: "POST",
      headers: authHeader(accessToken),
      body: JSON.stringify({ code }),
    }),

  // ---- Google ----
  googleLoginUrl: () => `${API_URL}/auth/google`,

  signupWithGoogle: (workspaceName: string, googleToken: string) =>
    request<SignupResult>("/auth/signup/google", {
      method: "POST",
      body: JSON.stringify({ workspaceName, googleToken }),
    }),

  // ---- Membros do workspace ----
  listMembers: (accessToken: string) =>
    request<MemberSummary[]>("/workspace/members", { headers: authHeader(accessToken) }),

  inviteMember: (accessToken: string, input: { email: string; name: string; role: string }) =>
    request<InviteResult>("/workspace/members/invite", {
      method: "POST",
      headers: authHeader(accessToken),
      body: JSON.stringify(input),
    }),

  removeMember: (accessToken: string, membershipId: string) =>
    request<{ success: true }>(`/workspace/members/${membershipId}`, {
      method: "DELETE",
      headers: authHeader(accessToken),
    }),

  acceptInvite: (inviteToken: string, password: string) =>
    request<SignupResult>("/auth/accept-invite", {
      method: "POST",
      body: JSON.stringify({ inviteToken, password }),
    }),

  // ---- Checkout connections (Etapa 5) ----
  listCheckoutConnections: (accessToken: string) =>
    request<CheckoutConnection[]>("/checkout-connections", { headers: authHeader(accessToken) }),

  createCheckoutConnection: (accessToken: string, label: string) =>
    request<CreateConnectionResult>("/checkout-connections", {
      method: "POST",
      headers: authHeader(accessToken),
      body: JSON.stringify({ platform: "generic_webhook", label }),
    }),

  deleteCheckoutConnection: (accessToken: string, id: string) =>
    request<{ success: true }>(`/checkout-connections/${id}`, {
      method: "DELETE",
      headers: authHeader(accessToken),
    }),

  sendTestEvent: (accessToken: string, id: string) =>
    request<{ sent: true; payload: Record<string, unknown> }>(
      `/checkout-connections/${id}/test-event`,
      { method: "POST", headers: authHeader(accessToken) },
    ),

  listRecentSales: (accessToken: string) =>
    request<SaleSummary[]>("/sales", { headers: authHeader(accessToken) }),
};
