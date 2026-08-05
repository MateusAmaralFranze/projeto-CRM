import { IsString, MaxLength, MinLength } from "class-validator";

export class SignupWithGoogleDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  workspaceName!: string;

  @IsString()
  googleToken!: string;
}
