import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";

import { AuthService } from "./auth.service";
import { InviteMemberDto, AcceptInviteDto } from "./dto/invite-member.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { RolesGuard } from "./guards/roles.guard";
import { Roles } from "./decorators/roles.decorator";
import { CurrentUser } from "./decorators/current-user.decorator";
import { AuthenticatedUser } from "./types/jwt-payload.type";

@Controller("workspace/members")
export class WorkspaceMembersController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.listMembers(user.workspaceId);
  }

  @Post("invite")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("owner", "admin")
  invite(@CurrentUser() user: AuthenticatedUser, @Body() dto: InviteMemberDto) {
    return this.authService.inviteMember(user.workspaceId, user.userId, dto);
  }

  @Delete(":membershipId")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("owner", "admin")
  remove(@CurrentUser() user: AuthenticatedUser, @Param("membershipId") membershipId: string) {
    return this.authService.removeMember(user.workspaceId, membershipId, user.userId);
  }
}

// Aceitar convite não exige estar logado ainda (é assim que o usuário convidado entra pela 1ª vez),
// por isso fica num controller separado, sem os guards acima.
@Controller("auth/accept-invite")
export class AcceptInviteController {
  constructor(private readonly authService: AuthService) {}

  @Post()
  accept(@Body() dto: AcceptInviteDto) {
    return this.authService.acceptInvite(dto);
  }
}
