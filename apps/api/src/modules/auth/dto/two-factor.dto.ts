import { IsString, Length } from "class-validator";

export class TwoFactorCodeDto {
  @IsString()
  @Length(6, 6, { message: "Código deve ter 6 dígitos" })
  code!: string;
}

export class VerifyLoginTwoFactorDto {
  @IsString()
  twoFaToken!: string;

  @IsString()
  @Length(6, 6, { message: "Código deve ter 6 dígitos" })
  code!: string;
}
