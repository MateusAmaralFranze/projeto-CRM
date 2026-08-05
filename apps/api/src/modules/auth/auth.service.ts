import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcryptjs";
import { authenticator } from "otplib";
import * as QRCode from "qrcode";
import { Prisma } from "@adtrack/database";

import { PrismaService } from "../../prisma/prisma.service";
import { slugify, randomSuffix } from "../../common/utils/slugify";
import { encrypt, decrypt } from "../../common/utils/crypto";
import { SignupDto } from "./dto/signup.dto";
import { LoginDto } from "./dto/login.dto";
import { SelectWorkspaceDto } from "./dto/select-workspace.dto";
import { InviteMemberDto, AcceptInviteDto } from "./dto/invite-member.dto";
import { VerifyLoginTwoFactorDto } from "./dto/two-factor.dto";
import { SignupWithGoogleDto } from "./dto/signup-google.dto";
import { GoogleProfile } from "./strategies/google.strategy";
import {
  JwtAccessPayload,
  JwtPreAuthPayload,
  JwtRefreshPayload,
  JwtTwoFaPendingPayload,
  JwtGoogleSignupPayload,
  JwtInvitePayload,
} from "./types/jwt-payload.type";

const SALT_ROUNDS = 12;

type UserWithMemberships = Prisma.UserGetPayload<{
  include: { memberships: { include: { workspace: true } } };
}>;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ==========================================
  // CADASTRO — cria workspace + usuário owner
  // ==========================================
  async signup(dto: SignupDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existingUser) {
      throw new ConflictException("Já existe uma conta com este e-mail.");
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const slug = await this.generateUniqueSlug(dto.workspaceName);

    const { workspace, user } = await this.prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: { name: dto.workspaceName, slug },
      });

      const user = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash,
          name: dto.userName,
        },
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: user.id,
          role: "owner",
          joinedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          workspaceId: workspace.id,
          userId: user.id,
          action: "workspace.created",
          entityType: "workspace",
          entityId: workspace.id,
        },
      });

      return { workspace, user };
    });

    const tokens = this.issueTokenPair({
      userId: user.id,
      workspaceId: workspace.id,
      role: "owner",
    });

    return {
      ...tokens,
      user: { id: user.id, name: user.name, email: user.email },
      workspace: { id: workspace.id, name: workspace.name, slug: workspace.slug },
    };
  }

  // ==========================================
  // LOGIN — passo 1: valida credenciais (+ dispara 2FA se ativo)
  // ==========================================
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: { memberships: { include: { workspace: true } } },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException("E-mail ou senha inválidos.");
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException("E-mail ou senha inválidos.");
    }

    if (user.memberships.length === 0) {
      throw new UnauthorizedException(
        "Este usuário não está vinculado a nenhum workspace.",
      );
    }

    if (user.twoFactorEnabled) {
      const payload: JwtTwoFaPendingPayload = { sub: user.id, type: "two_fa_pending" };
      const twoFaToken = this.jwt.sign(payload, { expiresIn: "5m" });
      return { requires2FA: true as const, twoFaToken };
    }

    return { requires2FA: false as const, ...this.completeLoginForUser(user) };
  }

  // ==========================================
  // LOGIN — passo 2 (só quando 2FA está ativo)
  // ==========================================
  async verifyLoginTwoFactor(dto: VerifyLoginTwoFactorDto) {
    let payload: JwtTwoFaPendingPayload;
    try {
      payload = this.jwt.verify<JwtTwoFaPendingPayload>(dto.twoFaToken);
    } catch {
      throw new UnauthorizedException("Sessão de login expirada, faça login novamente.");
    }
    if (payload.type !== "two_fa_pending") {
      throw new UnauthorizedException("Token inválido para esta operação.");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { memberships: { include: { workspace: true } } },
    });

    if (!user || !user.twoFactorSecret) {
      throw new UnauthorizedException("2FA não configurado para este usuário.");
    }

    const secret = decrypt(user.twoFactorSecret);
    const isValid = authenticator.check(dto.code, secret);
    if (!isValid) {
      throw new UnauthorizedException("Código de verificação inválido.");
    }

    return this.completeLoginForUser(user);
  }

  // ==========================================
  // LOGIN — passo 2 alternativo (múltiplos workspaces)
  // ==========================================
  async selectWorkspace(dto: SelectWorkspaceDto) {
    let payload: JwtPreAuthPayload;
    try {
      payload = this.jwt.verify<JwtPreAuthPayload>(dto.preAuthToken);
    } catch {
      throw new UnauthorizedException("Sessão de login expirada, faça login novamente.");
    }

    if (payload.type !== "pre_auth") {
      throw new UnauthorizedException("Token inválido para esta operação.");
    }

    const membership = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: dto.workspaceId, userId: payload.sub } },
      include: { workspace: true, user: true },
    });

    if (!membership) {
      throw new UnauthorizedException("Você não tem acesso a este workspace.");
    }

    const tokens = this.issueTokenPair({
      userId: membership.userId,
      workspaceId: membership.workspaceId,
      role: membership.role,
    });

    return {
      ...tokens,
      user: {
        id: membership.user.id,
        name: membership.user.name,
        email: membership.user.email,
      },
      workspace: {
        id: membership.workspace.id,
        name: membership.workspace.name,
        slug: membership.workspace.slug,
      },
    };
  }

  // Lista os workspaces disponíveis para um pre-auth token (usado quando o login,
  // inclusive via Google, resulta em múltiplos workspaces para escolher)
  async getWorkspacesForPreAuthToken(token: string) {
    let payload: JwtPreAuthPayload;
    try {
      payload = this.jwt.verify<JwtPreAuthPayload>(token);
    } catch {
      throw new UnauthorizedException("Sessão de login expirada, faça login novamente.");
    }
    if (payload.type !== "pre_auth") {
      throw new UnauthorizedException("Token inválido para esta operação.");
    }

    const memberships = await this.prisma.workspaceMember.findMany({
      where: { userId: payload.sub },
      include: { workspace: true },
    });

    return memberships.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      slug: m.workspace.slug,
      role: m.role,
    }));
  }

  // ==========================================
  // REFRESH — renova o access token
  // ==========================================
  async refresh(refreshToken: string) {
    let payload: JwtRefreshPayload;
    try {
      payload = this.jwt.verify<JwtRefreshPayload>(refreshToken);
    } catch {
      throw new UnauthorizedException("Refresh token inválido ou expirado.");
    }

    if (payload.type !== "refresh") {
      throw new UnauthorizedException("Token inválido para esta operação.");
    }

    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId: payload.workspaceId, userId: payload.sub },
      },
    });

    if (!membership) {
      throw new UnauthorizedException("Acesso a este workspace foi revogado.");
    }

    return this.issueTokenPair({
      userId: payload.sub,
      workspaceId: payload.workspaceId,
      role: membership.role,
    });
  }

  // ==========================================
  // ME
  // ==========================================
  async me(userId: string, workspaceId: string) {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      include: { user: true, workspace: true },
    });

    if (!membership) {
      throw new UnauthorizedException("Acesso a este workspace foi revogado.");
    }

    return {
      user: {
        id: membership.user.id,
        name: membership.user.name,
        email: membership.user.email,
        twoFactorEnabled: membership.user.twoFactorEnabled,
      },
      workspace: {
        id: membership.workspace.id,
        name: membership.workspace.name,
        slug: membership.workspace.slug,
      },
      role: membership.role,
    };
  }

  // ==========================================
  // 2FA
  // ==========================================
  async setupTwoFactor(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const secret = authenticator.generateSecret();
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: encrypt(secret) },
    });

    const otpauthUrl = authenticator.keyuri(user.email, "AdTrack", secret);
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    return { secret, qrCodeDataUrl };
  }

  async enableTwoFactor(userId: string, code: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    if (!user.twoFactorSecret) {
      throw new BadRequestException(
        "Nenhuma configuração de 2FA pendente. Chame /auth/2fa/setup primeiro.",
      );
    }

    const secret = decrypt(user.twoFactorSecret);
    const isValid = authenticator.check(code, secret);
    if (!isValid) {
      throw new UnauthorizedException("Código inválido.");
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });

    return { success: true };
  }

  async disableTwoFactor(userId: string, code: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new BadRequestException("2FA não está ativo para este usuário.");
    }

    const secret = decrypt(user.twoFactorSecret);
    const isValid = authenticator.check(code, secret);
    if (!isValid) {
      throw new UnauthorizedException("Código inválido.");
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });

    return { success: true };
  }

  // ==========================================
  // GOOGLE OAUTH
  // ==========================================
  async loginOrSignupWithGoogle(profile: GoogleProfile) {
    const user = await this.prisma.user.findUnique({
      where: { email: profile.email },
      include: { memberships: { include: { workspace: true } } },
    });

    if (!user) {
      const payload: JwtGoogleSignupPayload = {
        email: profile.email,
        name: profile.name,
        googleId: profile.googleId,
        type: "google_signup",
      };
      const googleSignupToken = this.jwt.sign(payload, { expiresIn: "15m" });
      return { needsSignup: true as const, googleSignupToken };
    }

    if (user.memberships.length === 0) {
      throw new UnauthorizedException(
        "Este usuário não está vinculado a nenhum workspace.",
      );
    }

    // Login via Google é considerado um fator forte o bastante — não exige 2FA adicional aqui.
    return { needsSignup: false as const, ...this.completeLoginForUser(user) };
  }

  async signupWithGoogle(dto: SignupWithGoogleDto) {
    let payload: JwtGoogleSignupPayload;
    try {
      payload = this.jwt.verify<JwtGoogleSignupPayload>(dto.googleToken);
    } catch {
      throw new UnauthorizedException("Sessão do Google expirada, tente novamente.");
    }
    if (payload.type !== "google_signup") {
      throw new UnauthorizedException("Token inválido para esta operação.");
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { email: payload.email },
    });
    if (existingUser) {
      throw new ConflictException("Já existe uma conta com este e-mail.");
    }

    const slug = await this.generateUniqueSlug(dto.workspaceName);

    const { workspace, user } = await this.prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: { name: dto.workspaceName, slug },
      });

      const user = await tx.user.create({
        data: { email: payload.email, name: payload.name, passwordHash: null },
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: user.id,
          role: "owner",
          joinedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          workspaceId: workspace.id,
          userId: user.id,
          action: "workspace.created",
          entityType: "workspace",
          entityId: workspace.id,
        },
      });

      return { workspace, user };
    });

    const tokens = this.issueTokenPair({
      userId: user.id,
      workspaceId: workspace.id,
      role: "owner",
    });

    return {
      ...tokens,
      user: { id: user.id, name: user.name, email: user.email },
      workspace: { id: workspace.id, name: workspace.name, slug: workspace.slug },
    };
  }

  // ==========================================
  // CONVITE DE MEMBROS
  // ==========================================
  async inviteMember(workspaceId: string, invitedByUserId: string, dto: InviteMemberDto) {
    let user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });

    if (user) {
      const existingMembership = await this.prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId: user.id } },
      });
      if (existingMembership) {
        throw new ConflictException("Este usuário já é membro deste workspace.");
      }

      await this.prisma.workspaceMember.create({
        data: {
          workspaceId,
          userId: user.id,
          role: dto.role,
          invitedAt: new Date(),
          joinedAt: user.passwordHash ? new Date() : null,
        },
      });

      if (user.passwordHash) {
        await this.logInvite(workspaceId, invitedByUserId, user.id);
        return {
          status: "added" as const,
          message: "Usuário já tinha conta e foi adicionado diretamente ao workspace.",
        };
      }
    } else {
      user = await this.prisma.user.create({
        data: { email: dto.email.toLowerCase(), name: dto.name, passwordHash: null },
      });

      await this.prisma.workspaceMember.create({
        data: { workspaceId, userId: user.id, role: dto.role, invitedAt: new Date() },
      });
    }

    await this.logInvite(workspaceId, invitedByUserId, user.id);

    const payload: JwtInvitePayload = { sub: user.id, workspaceId, type: "invite" };
    const inviteToken = this.jwt.sign(payload, { expiresIn: "7d" });
    const appUrl = this.config.get<string>("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    const inviteUrl = `${appUrl}/convite?token=${inviteToken}`;

    return { status: "invited" as const, inviteToken, inviteUrl };
  }

  async acceptInvite(dto: AcceptInviteDto) {
    let payload: JwtInvitePayload;
    try {
      payload = this.jwt.verify<JwtInvitePayload>(dto.inviteToken);
    } catch {
      throw new UnauthorizedException("Convite inválido ou expirado.");
    }
    if (payload.type !== "invite") {
      throw new UnauthorizedException("Token inválido para esta operação.");
    }

    const membership = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: payload.workspaceId, userId: payload.sub } },
      include: { workspace: true, user: true },
    });

    if (!membership) {
      throw new NotFoundException("Convite não encontrado.");
    }
    if (membership.joinedAt) {
      throw new ConflictException("Este convite já foi utilizado.");
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: payload.sub }, data: { passwordHash } }),
      this.prisma.workspaceMember.update({
        where: { workspaceId_userId: { workspaceId: payload.workspaceId, userId: payload.sub } },
        data: { joinedAt: new Date() },
      }),
    ]);

    const tokens = this.issueTokenPair({
      userId: membership.userId,
      workspaceId: membership.workspaceId,
      role: membership.role,
    });

    return {
      ...tokens,
      user: {
        id: membership.user.id,
        name: membership.user.name,
        email: membership.user.email,
      },
      workspace: {
        id: membership.workspace.id,
        name: membership.workspace.name,
        slug: membership.workspace.slug,
      },
    };
  }

  async listMembers(workspaceId: string) {
    const members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: { user: true },
      orderBy: { invitedAt: "asc" },
    });

    return members.map((m) => ({
      membershipId: m.id,
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
      status: m.joinedAt ? ("active" as const) : ("pending" as const),
      invitedAt: m.invitedAt,
      joinedAt: m.joinedAt,
    }));
  }

  async removeMember(workspaceId: string, membershipId: string, requesterUserId: string) {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: { id: membershipId },
    });

    if (!membership || membership.workspaceId !== workspaceId) {
      throw new NotFoundException("Membro não encontrado.");
    }
    if (membership.role === "owner") {
      throw new ForbiddenException("Não é possível remover o owner do workspace.");
    }
    if (membership.userId === requesterUserId) {
      throw new ForbiddenException("Você não pode remover a si mesmo.");
    }

    await this.prisma.workspaceMember.delete({ where: { id: membershipId } });
    return { success: true };
  }

  // ==========================================
  // HELPERS
  // ==========================================
  private completeLoginForUser(user: UserWithMemberships) {
    if (user.memberships.length === 1) {
      const membership = user.memberships[0];
      const tokens = this.issueTokenPair({
        userId: user.id,
        workspaceId: membership.workspaceId,
        role: membership.role,
      });
      return {
        requiresWorkspaceSelection: false as const,
        ...tokens,
        user: { id: user.id, name: user.name, email: user.email },
        workspace: {
          id: membership.workspace.id,
          name: membership.workspace.name,
          slug: membership.workspace.slug,
        },
      };
    }

    const preAuthPayload: JwtPreAuthPayload = { sub: user.id, type: "pre_auth" };
    const preAuthToken = this.jwt.sign(preAuthPayload, { expiresIn: "5m" });

    return {
      requiresWorkspaceSelection: true as const,
      preAuthToken,
      workspaces: user.memberships.map((m) => ({
        id: m.workspace.id,
        name: m.workspace.name,
        slug: m.workspace.slug,
        role: m.role,
      })),
    };
  }

  private async logInvite(workspaceId: string, invitedByUserId: string, invitedUserId: string) {
    await this.prisma.auditLog.create({
      data: {
        workspaceId,
        userId: invitedByUserId,
        action: "member.invited",
        entityType: "user",
        entityId: invitedUserId,
      },
    });
  }

  private issueTokenPair(claims: { userId: string; workspaceId: string; role: string }) {
    const accessPayload: JwtAccessPayload = {
      sub: claims.userId,
      workspaceId: claims.workspaceId,
      role: claims.role,
      type: "access",
    };
    const refreshPayload: JwtRefreshPayload = {
      sub: claims.userId,
      workspaceId: claims.workspaceId,
      type: "refresh",
    };

    const accessToken = this.jwt.sign(accessPayload, {
      expiresIn: this.config.get<string>("JWT_EXPIRES_IN", "15m"),
    });
    const refreshToken = this.jwt.sign(refreshPayload, {
      expiresIn: this.config.get<string>("JWT_REFRESH_EXPIRES_IN", "30d"),
    });

    return { accessToken, refreshToken };
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    const base = slugify(name) || "workspace";
    let candidate = base;

    for (let attempt = 0; attempt < 5; attempt++) {
      const exists = await this.prisma.workspace.findUnique({ where: { slug: candidate } });
      if (!exists) return candidate;
      candidate = `${base}-${randomSuffix()}`;
    }

    return `${base}-${randomSuffix(8)}`;
  }
}
