// Contrato do payload esperado em POST /webhooks/checkout/:connectionId
//
// Campos obrigatórios: externalId, status, amountCents
// Todo o resto é opcional — quanto mais dado enviado, melhor a atribuição/métricas depois.
export type GenericWebhookPayload = {
  externalId: string; // id único do pedido no sistema de origem — usado como chave de idempotência
  status: "pending" | "paid" | "refunded" | "chargeback" | "canceled";
  amountCents: number; // valor em centavos, nunca float
  productName?: string;
  productExternalId?: string;
  customerEmail?: string; // será convertido em hash antes de gravar, nunca fica em texto puro
  clickId?: string; // click_id gerado pelo nosso próprio link/pixel, se propagado até o checkout
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  paidAt?: string; // ISO 8601
};
