import { createHmac, timingSafeEqual } from "node:crypto";

export function signPayload(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

// Comparação em tempo constante — evita vazar informação sobre a assinatura correta via timing attack.
export function verifySignature(secret: string, payload: string, signature: string): boolean {
  const expected = signPayload(secret, payload);
  const expectedBuffer = Buffer.from(expected, "hex");
  const providedBuffer = Buffer.from(signature, "hex");

  if (expectedBuffer.length !== providedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, providedBuffer);
}
