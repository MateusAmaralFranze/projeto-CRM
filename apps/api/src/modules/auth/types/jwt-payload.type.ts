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

export type AuthenticatedUser = {
  userId: string;
  workspaceId: string;
  role: string;
};
