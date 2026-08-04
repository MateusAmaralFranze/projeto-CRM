import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

// Uso: @UseGuards(JwtAuthGuard) em qualquer controller/rota que exige login.
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {}
