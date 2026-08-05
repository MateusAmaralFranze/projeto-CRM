import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ConfigService } from "@nestjs/config";
import { Strategy, VerifyCallback, Profile } from "passport-google-oauth20";

export type GoogleProfile = {
  googleId: string;
  email: string;
  name: string;
};

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, "google") {
  constructor(config: ConfigService) {
    super({
      clientID: config.get<string>("GOOGLE_OAUTH_CLIENT_ID") || "not-configured",
      clientSecret: config.get<string>("GOOGLE_OAUTH_CLIENT_SECRET") || "not-configured",
      callbackURL: config.get<string>("GOOGLE_CALLBACK_URL") ??
        "http://localhost:3333/auth/google/callback",
      scope: ["email", "profile"],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): void {
    const email = profile.emails?.[0]?.value;

    if (!email) {
      done(new Error("Conta do Google não retornou e-mail."), undefined);
      return;
    }

    const googleProfile: GoogleProfile = {
      googleId: profile.id,
      email: email.toLowerCase(),
      name: profile.displayName ?? email.split("@")[0],
    };

    done(null, googleProfile);
  }
}
