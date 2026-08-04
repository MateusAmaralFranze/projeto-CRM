import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { BullModule } from "@nestjs/bullmq";

import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { CoreModule } from "./modules/core/core.module";
import { CrmModule } from "./modules/crm/crm.module";
import { BillingModule } from "./modules/billing/billing.module";
import { AttributionModule } from "./modules/attribution/attribution.module";
import { IngestionModule } from "./modules/ingestion/ingestion.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ["../../.env"],
    }),
    BullModule.forRoot({
      connection: {
        url: process.env.REDIS_URL ?? "redis://localhost:6379",
      },
    }),
    PrismaModule,
    AuthModule,
    CoreModule,
    CrmModule,
    BillingModule,
    AttributionModule,
    IngestionModule,
  ],
})
export class AppModule {}
