export type JwtAccessPayload = {
  sub: string; // userId
  workspaceId: string;
  role: string;
  type: "access";
};

export type JwtRefreshPayload = {
  sub: string;
  workspaceId: string;
  type: "refresh";
};

// Emitido quando o usuário tem mais de um workspace e ainda precisa escolher qual usar.
export type JwtPreAuthPayload = {
  sub: string;
  type: "pre_auth";
};

// Emitido logo após validar e-mail/senha quando o usuário tem 2FA ativo,
// antes de qualquer token de acesso real ser gerado.
export type JwtTwoFaPendingPayload = {
  sub: string;
  type: "two_fa_pending";
};

// Emitido no callback do Google quando o e-mail ainda não tem conta —
// carrega os dados do perfil do Google até o usuário definir o nome do workspace.
export type JwtGoogleSignupPayload = {
  email: string;
  name: string;
  googleId: string;
  type: "google_signup";
};

// Emitido ao convidar um membro — usado uma única vez para definir a senha e ativar a conta.
export type JwtInvitePayload = {
  sub: string; // userId do convidado (já criado, mas sem senha ainda)
  workspaceId: string;
  type: "invite";
};

export type AuthenticatedUser = {
  userId: string;
  workspaceId: string;
  role: string;
};
