import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request, Response } from "express";

import { AuthService } from "./auth.service";
import { SignupDto } from "./dto/signup.dto";
import { LoginDto } from "./dto/login.dto";
import { SelectWorkspaceDto } from "./dto/select-workspace.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { TwoFactorCodeDto, VerifyLoginTwoFactorDto } from "./dto/two-factor.dto";
import { SignupWithGoogleDto } from "./dto/signup-google.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { GoogleAuthGuard } from "./guards/google-auth.guard";
import { CurrentUser } from "./decorators/current-user.decorator";
import { AuthenticatedUser } from "./types/jwt-payload.type";
import { GoogleProfile } from "./strategies/google.strategy";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  // ==========================================
  // CADASTRO / LOGIN POR E-MAIL+SENHA
  // ==========================================
  @Post("signup")
  signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post("select-workspace")
  @HttpCode(HttpStatus.OK)
  selectWorkspace(@Body() dto: SelectWorkspaceDto) {
    return this.authService.selectWorkspace(dto);
  }

  @Get("pre-auth/workspaces")
  getWorkspacesForPreAuthToken(@Query("token") token: string) {
    return this.authService.getWorkspacesForPreAuthToken(token);
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.me(user.userId, user.workspaceId);
  }

  // ==========================================
  // 2FA
  // ==========================================
  @Post("2fa/setup")
  @UseGuards(JwtAuthGuard)
  setupTwoFactor(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.setupTwoFactor(user.userId);
  }

  @Post("2fa/enable")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  enableTwoFactor(@CurrentUser() user: AuthenticatedUser, @Body() dto: TwoFactorCodeDto) {
    return this.authService.enableTwoFactor(user.userId, dto.code);
  }

  @Post("2fa/disable")
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  disableTwoFactor(@CurrentUser() user: AuthenticatedUser, @Body() dto: TwoFactorCodeDto) {
    return this.authService.disableTwoFactor(user.userId, dto.code);
  }

  @Post("2fa/verify-login")
  @HttpCode(HttpStatus.OK)
  verifyLoginTwoFactor(@Body() dto: VerifyLoginTwoFactorDto) {
    return this.authService.verifyLoginTwoFactor(dto);
  }

  // ==========================================
  // GOOGLE OAUTH
  // ==========================================
  @Get("google")
  @UseGuards(GoogleAuthGuard)
  googleAuth() {
    // O GoogleAuthGuard intercepta a request e redireciona pro Google.
    // Este método nunca chega a executar.
  }

  @Get("google/callback")
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Req() req: Request & { user: GoogleProfile }, @Res() res: Response) {
    const frontendUrl = this.config.get<string>("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    const result = await this.authService.loginOrSignupWithGoogle(req.user);

    if (result.needsSignup) {
      return res.redirect(`${frontendUrl}/cadastro/google?token=${result.googleSignupToken}`);
    }

    if (result.requiresWorkspaceSelection) {
      return res.redirect(
        `${frontendUrl}/login?preAuthToken=${result.preAuthToken}&multiWorkspace=1`,
      );
    }

    return res.redirect(
      `${frontendUrl}/auth/callback?accessToken=${result.accessToken}&refreshToken=${result.refreshToken}`,
    );
  }

  // ==========================================
  // CADASTRO VIA GOOGLE (workspace ainda não existia)
  // ==========================================
  @Post("signup/google")
  signupWithGoogle(@Body() dto: SignupWithGoogleDto) {
    return this.authService.signupWithGoogle(dto);
  }
}
