import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { ConfigService } from "@nestjs/config";
import { Queue } from "bullmq";
import { randomBytes, randomUUID } from "node:crypto";

import { PrismaService } from "../../prisma/prisma.service";
import { verifySignature } from "../../common/utils/hmac";
import { CreateCheckoutConnectionDto } from "./dto/create-checkout-connection.dto";
import { GenericWebhookPayload } from "./types/generic-webhook-payload.type";

const VALID_STATUSES = ["pending", "paid", "refunded", "chargeback", "canceled"];

@Injectable()
export class IngestionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    @InjectQueue("checkout-webhooks") private readonly checkoutQueue: Queue,
  ) {}

  // ==========================================
  // CONEXÕES DE CHECKOUT (CRUD protegido)
  // ==========================================
  async createCheckoutConnection(workspaceId: string, dto: CreateCheckoutConnectionDto) {
    const webhookSecret = randomBytes(24).toString("hex");

    const connection = await this.prisma.checkoutConnection.create({
      data: {
        workspaceId,
        platform: dto.platform,
        externalAccountId: dto.label ?? null,
        webhookSecret,
      },
    });

    const apiUrl = this.config.get<string>("API_URL", "http://localhost:3333");

    return {
      id: connection.id,
      platform: connection.platform,
      label: connection.externalAccountId,
      webhookUrl: `${apiUrl}/webhooks/checkout/${connection.id}`,
      // O secret só é exposto neste momento de criação — depois disso, nunca mais é retornado por completo.
      webhookSecret,
      createdAt: connection.createdAt,
    };
  }

  async listCheckoutConnections(workspaceId: string) {
    const connections = await this.prisma.checkoutConnection.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "asc" },
    });

    return connections.map((c) => ({
      id: c.id,
      platform: c.platform,
      label: c.externalAccountId,
      status: c.status,
      createdAt: c.createdAt,
    }));
  }

  async deleteCheckoutConnection(workspaceId: string, id: string) {
    const connection = await this.prisma.checkoutConnection.findUnique({ where: { id } });
    if (!connection || connection.workspaceId !== workspaceId) {
      throw new NotFoundException("Conexão não encontrada.");
    }
    await this.prisma.checkoutConnection.delete({ where: { id } });
    return { success: true };
  }

  // Dispara um evento fake através da mesma fila de processamento real —
  // forma rápida de validar o fluxo sem precisar calcular HMAC manualmente.
  async sendTestEvent(workspaceId: string, connectionId: string) {
    const connection = await this.prisma.checkoutConnection.findUnique({
      where: { id: connectionId },
    });
    if (!connection || connection.workspaceId !== workspaceId) {
      throw new NotFoundException("Conexão não encontrada.");
    }

    const payload: GenericWebhookPayload = {
      externalId: `test-${randomUUID()}`,
      status: "paid",
      amountCents: 9700,
      productName: "Produto de teste",
      customerEmail: "teste@exemplo.com",
      utmSource: "facebook",
      utmMedium: "cpc",
      utmCampaign: "campanha-teste",
    };

    await this.checkoutQueue.add("process-checkout-event", { connectionId, payload });
    return { sent: true, payload };
  }

  // ==========================================
  // RECEBIMENTO DO WEBHOOK (público, validado por HMAC)
  // ==========================================
  async receiveWebhook(connectionId: string, rawBody: Buffer | undefined, signature: string | undefined) {
    const connection = await this.prisma.checkoutConnection.findUnique({
      where: { id: connectionId },
    });
    if (!connection) {
      throw new NotFoundException("Conexão de checkout não encontrada.");
    }
    if (connection.status !== "active") {
      throw new ForbiddenException("Esta conexão está desativada.");
    }
    if (!rawBody || !signature || !verifySignature(connection.webhookSecret, rawBody.toString("utf8"), signature)) {
      throw new UnauthorizedException("Assinatura inválida.");
    }

    let payload: GenericWebhookPayload;
    try {
      payload = JSON.parse(rawBody.toString("utf8"));
    } catch {
      throw new BadRequestException("JSON inválido.");
    }

    this.validatePayload(payload);

    await this.checkoutQueue.add(
      "process-checkout-event",
      { connectionId, payload },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    return { received: true };
  }

  // ==========================================
  // VENDAS RECENTES (visão rápida — o dashboard completo chega na Etapa 7)
  // ==========================================
  async listRecentSales(workspaceId: string) {
    const sales = await this.prisma.sale.findMany({
      where: { workspaceId },
      include: { product: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return sales.map((s) => ({
      id: s.id,
      externalId: s.externalId,
      status: s.status,
      amountCents: s.amountCents,
      productName: s.product?.name ?? null,
      utmSource: s.rawUtmSource,
      utmCampaign: s.rawUtmCampaign,
      createdAt: s.createdAt,
    }));
  }

  private validatePayload(payload: GenericWebhookPayload) {
    if (!payload.externalId || typeof payload.externalId !== "string") {
      throw new BadRequestException('Campo "externalId" é obrigatório.');
    }
    if (!VALID_STATUSES.includes(payload.status)) {
      throw new BadRequestException(
        `Campo "status" deve ser um de: ${VALID_STATUSES.join(", ")}.`,
      );
    }
    if (typeof payload.amountCents !== "number" || payload.amountCents < 0) {
      throw new BadRequestException('Campo "amountCents" deve ser um número >= 0.');
    }
  }
}
