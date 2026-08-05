import { Controller, Headers, HttpCode, HttpStatus, Param, Post, Req } from "@nestjs/common";
import type { Request } from "express";

import { IngestionService } from "./ingestion.service";

@Controller("webhooks/checkout")
export class CheckoutWebhookController {
  constructor(private readonly ingestion: IngestionService) {}

  @Post(":connectionId")
  @HttpCode(HttpStatus.ACCEPTED)
  receive(
    @Param("connectionId") connectionId: string,
    @Req() req: Request & { rawBody?: Buffer },
    @Headers("x-adtrack-signature") signature?: string,
  ) {
    return this.ingestion.receiveWebhook(connectionId, req.rawBody, signature);
  }
}
