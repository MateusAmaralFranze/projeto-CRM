import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";

import { IngestionService } from "./ingestion.service";
import { CreateCheckoutConnectionDto } from "./dto/create-checkout-connection.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { AuthenticatedUser } from "../auth/types/jwt-payload.type";

@Controller("checkout-connections")
export class CheckoutConnectionsController {
  constructor(private readonly ingestion: IngestionService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.ingestion.listCheckoutConnections(user.workspaceId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("owner", "admin", "traffic_manager")
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCheckoutConnectionDto) {
    return this.ingestion.createCheckoutConnection(user.workspaceId, dto);
  }

  @Post(":id/test-event")
  @UseGuards(JwtAuthGuard)
  sendTestEvent(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.ingestion.sendTestEvent(user.workspaceId, id);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("owner", "admin")
  remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.ingestion.deleteCheckoutConnection(user.workspaceId, id);
  }
}

@Controller("sales")
export class SalesController {
  constructor(private readonly ingestion: IngestionService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  listRecent(@CurrentUser() user: AuthenticatedUser) {
    return this.ingestion.listRecentSales(user.workspaceId);
  }
}
