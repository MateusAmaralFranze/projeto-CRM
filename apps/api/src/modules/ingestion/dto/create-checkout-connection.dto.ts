import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateCheckoutConnectionDto {
  // Só "generic_webhook" por enquanto — Kiwify/Hotmart específicos chegam em blocos futuros.
  @IsIn(["generic_webhook"], {
    message:
      "Por enquanto só o tipo 'generic_webhook' está disponível. Integrações específicas (Kiwify, Hotmart etc.) chegam em blocos futuros.",
  })
  platform!: "generic_webhook";

  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string;
}
