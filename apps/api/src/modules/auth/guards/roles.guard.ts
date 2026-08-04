import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { ROLES_KEY } from "../decorators/roles.decorator";
import { AuthenticatedUser } from "../types/jwt-payload.type";

// Uso: @UseGuards(JwtAuthGuard, RolesGuard) + @Roles('owner', 'admin')
// A ordem importa: RolesGuard depende de request.user já ter sido preenchido pelo JwtAuthGuard.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Rota sem @Roles(...) -> qualquer usuário autenticado pode acessar
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser | undefined = request.user;

    if (!user || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        "Você não tem permissão para executar esta ação neste workspace.",
      );
    }

    return true;
  }
}
