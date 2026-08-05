import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { Job } from "bullmq";

import { PrismaService } from "../../prisma/prisma.service";
import { hashEmail } from "../../common/utils/hash";
import { GenericWebhookPayload } from "./types/generic-webhook-payload.type";

type JobData = { connectionId: string; payload: GenericWebhookPayload };

@Injectable()
@Processor("checkout-webhooks")
export class CheckoutWebhookProcessor extends WorkerHost {
  private readonly logger = new Logger(CheckoutWebhookProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<JobData>) {
    const { connectionId, payload } = job.data;

    const connection = await this.prisma.checkoutConnection.findUnique({
      where: { id: connectionId },
    });
    if (!connection) {
      this.logger.warn(`Conexão ${connectionId} não encontrada — evento descartado.`);
      return;
    }

    // Produto: busca por externalId dentro do workspace; cria se ainda não existir.
    let productId: string | null = null;
    if (payload.productExternalId) {
      let product = await this.prisma.product.findFirst({
        where: { workspaceId: connection.workspaceId, externalId: payload.productExternalId },
      });
      if (!product) {
        product = await this.prisma.product.create({
          data: {
            workspaceId: connection.workspaceId,
            name: payload.productName ?? "Produto sem nome",
            externalId: payload.productExternalId,
          },
        });
      }
      productId = product.id;
    }

    const customerEmailHash = payload.customerEmail ? hashEmail(payload.customerEmail) : null;
    const paidAt = payload.paidAt
      ? new Date(payload.paidAt)
      : payload.status === "paid"
        ? new Date()
        : null;

    // Upsert por (checkoutConnectionId, externalId) — reenvios do mesmo evento (ex: retry do
    // checkout de origem) atualizam a venda existente em vez de duplicar.
    const sale = await this.prisma.sale.upsert({
      where: {
        checkoutConnectionId_externalId: {
          checkoutConnectionId: connectionId,
          externalId: payload.externalId,
        },
      },
      create: {
        workspaceId: connection.workspaceId,
        checkoutConnectionId: connectionId,
        productId,
        externalId: payload.externalId,
        status: payload.status,
        amountCents: payload.amountCents,
        customerEmailHash,
        clickId: payload.clickId ?? null,
        rawUtmSource: payload.utmSource ?? null,
        rawUtmMedium: payload.utmMedium ?? null,
        rawUtmCampaign: payload.utmCampaign ?? null,
        rawUtmContent: payload.utmContent ?? null,
        paidAt,
      },
      update: {
        status: payload.status,
        amountCents: payload.amountCents,
        paidAt: paidAt ?? undefined,
      },
    });

    // Registra reembolso/chargeback (uma vez só por tipo, mesmo que o evento chegue de novo)
    // Atenção: Sale.status usa "refunded", mas Refund.type usa "refund" — enums diferentes no schema.
    if (payload.status === "refunded" || payload.status === "chargeback") {
      const refundType = payload.status === "refunded" ? "refund" : "chargeback";
      const existingRefund = await this.prisma.refund.findFirst({
        where: { saleId: sale.id, type: refundType },
      });
      if (!existingRefund) {
        await this.prisma.refund.create({
          data: {
            workspaceId: connection.workspaceId,
            saleId: sale.id,
            amountCents: payload.amountCents,
            type: refundType,
          },
        });
      }
    }

    this.logger.log(
      `Venda ${payload.externalId} processada (status: ${payload.status}) — workspace ${connection.workspaceId}`,
    );
  }
}
