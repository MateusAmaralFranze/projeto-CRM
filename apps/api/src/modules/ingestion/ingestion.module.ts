import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";

import { IngestionService } from "./ingestion.service";
import { CheckoutConnectionsController, SalesController } from "./checkout-connections.controller";
import { CheckoutWebhookController } from "./checkout-webhook.controller";
import { CheckoutWebhookProcessor } from "./checkout-webhook.processor";

@Module({
  imports: [BullModule.registerQueue({ name: "checkout-webhooks" })],
  controllers: [CheckoutConnectionsController, SalesController, CheckoutWebhookController],
  providers: [IngestionService, CheckoutWebhookProcessor],
})
export class IngestionModule {}
