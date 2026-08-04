import { IsEmail, IsString, MinLength, MaxLength } from "class-validator";

export class SignupDto {
  @IsString()
  @MinLength(2, { message: "Nome da empresa deve ter ao menos 2 caracteres" })
  @MaxLength(120)
  workspaceName!: string;

  @IsString()
  @MinLength(2, { message: "Nome deve ter ao menos 2 caracteres" })
  @MaxLength(120)
  userName!: string;

  @IsEmail({}, { message: "E-mail inválido" })
  email!: string;

  @IsString()
  @MinLength(8, { message: "Senha deve ter ao menos 8 caracteres" })
  @MaxLength(72) // limite do bcrypt
  password!: string;
}
