import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ConfigService } from "@nestjs/config";
import { ExtractJwt, Strategy } from "passport-jwt";

import { JwtAccessPayload, AuthenticatedUser } from "../types/jwt-payload.type";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>("JWT_SECRET")!,
    });
  }

  // O retorno aqui vira `request.user` em qualquer rota protegida pelo JwtAuthGuard.
  validate(payload: JwtAccessPayload): AuthenticatedUser {
    if (payload.type !== "access") {
      throw new UnauthorizedException("Token inválido para autenticação.");
    }
    return {
      userId: payload.sub,
      workspaceId: payload.workspaceId,
      role: payload.role,
    };
  }
}
