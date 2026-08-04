import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcryptjs";

import { PrismaService } from "../../prisma/prisma.service";
import { slugify, randomSuffix } from "../../common/utils/slugify";
import { SignupDto } from "./dto/signup.dto";
import { LoginDto } from "./dto/login.dto";
import { SelectWorkspaceDto } from "./dto/select-workspace.dto";
import {
  JwtAccessPayload,
  JwtPreAuthPayload,
  JwtRefreshPayload,
} from "./types/jwt-payload.type";

const SALT_ROUNDS = 12;

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
  // LOGIN — passo 1: valida credenciais
  // ==========================================
  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: {
        memberships: {
          include: { workspace: true },
        },
      },
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

    // TODO (próximo bloco): se user.twoFactorEnabled, retornar aqui pedindo o código 2FA
    // antes de emitir qualquer token, em vez do fluxo abaixo.

    // Usuário só tem 1 workspace -> já loga direto
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

    // Usuário tem múltiplos workspaces -> precisa escolher
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

  // ==========================================
  // LOGIN — passo 2 (só quando há múltiplos workspaces)
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

    // Revalida que o vínculo com o workspace ainda existe (usuário pode ter sido removido nesse meio tempo)
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
  // ME — dados do usuário autenticado + workspace atual
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
  // HELPERS
  // ==========================================
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

    // tenta o slug "limpo" primeiro; se colidir, anexa sufixo aleatório até achar um livre
    for (let attempt = 0; attempt < 5; attempt++) {
      const exists = await this.prisma.workspace.findUnique({
        where: { slug: candidate },
      });
      if (!exists) return candidate;
      candidate = `${base}-${randomSuffix()}`;
    }

    // fallback extremamente improvável de acontecer, mas garante que nunca trava
    return `${base}-${randomSuffix(8)}`;
  }
}
