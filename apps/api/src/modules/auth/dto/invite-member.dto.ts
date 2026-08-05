import { IsEmail, IsIn, IsString, MaxLength, MinLength } from "class-validator";

const INVITABLE_ROLES = ["admin", "traffic_manager", "closer", "viewer"] as const;

export class InviteMemberDto {
  @IsEmail({}, { message: "E-mail inválido" })
  email!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  // Owner não é convidável — só existe 1 owner, definido no cadastro do workspace.
  @IsIn(INVITABLE_ROLES, { message: `Papel deve ser um de: ${INVITABLE_ROLES.join(", ")}` })
  role!: (typeof INVITABLE_ROLES)[number];
}

export class AcceptInviteDto {
  @IsString()
  inviteToken!: string;

  @IsString()
  @MinLength(8, { message: "Senha deve ter ao menos 8 caracteres" })
  @MaxLength(72)
  password!: string;
}
