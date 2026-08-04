import { Module } from "@nestjs/common";

// Webhook receiver (checkouts) + workers BullMQ (sync de Ad Platforms,
// processamento de eventos de webhook, avaliação de alertas).
// Implementação chega nas Etapas 4 e 5.
@Module({})
export class IngestionModule {}
