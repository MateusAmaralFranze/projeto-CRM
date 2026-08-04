import { SetMetadata } from "@nestjs/common";

export const ROLES_KEY = "roles";

// Uso: @Roles('owner', 'admin') acima de um controller/rota.
// Papéis válidos: owner, admin, traffic_manager, closer, viewer (mesmos do enum WorkspaceRole no schema).
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
