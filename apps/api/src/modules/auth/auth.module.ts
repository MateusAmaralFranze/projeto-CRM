import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";

import { AuthController } from "./auth.controller";
import { WorkspaceMembersController, AcceptInviteController } from "./workspace-members.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { GoogleStrategy } from "./strategies/google.strategy";
import { RolesGuard } from "./guards/roles.guard";

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>("JWT_SECRET"),
        signOptions: { expiresIn: config.get<string>("JWT_EXPIRES_IN", "15m") },
      }),
    }),
  ],
  controllers: [AuthController, WorkspaceMembersController, AcceptInviteController],
  providers: [AuthService, JwtStrategy, GoogleStrategy, RolesGuard],
  exports: [AuthService, RolesGuard],
})
export class AuthModule {}
