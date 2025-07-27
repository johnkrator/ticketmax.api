import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuthProfile } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private isConfigured = false;

  constructor(private configService: ConfigService) {
    const clientID = configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET');

    // Always call supper with default values, but track if properly configured
    super({
      clientID:
        clientID && clientID !== 'your-google-client-id'
          ? clientID
          : 'dummy-client-id',
      clientSecret:
        clientSecret && clientSecret !== 'your-google-client-secret'
          ? clientSecret
          : 'dummy-client-secret',
      callbackURL:
        configService.get<string>('GOOGLE_CALLBACK_URL') ||
        'http://localhost:3500/auth/google/callback',
      scope: ['email', 'profile'],
    });

    // Check if we have a valid configuration
    this.isConfigured = !!(
      clientID &&
      clientID !== 'your-google-client-id' &&
      clientSecret &&
      clientSecret !== 'your-google-client-secret'
    );

    if (!this.isConfigured) {
      console.warn('Google OAuth not configured - using dummy credentials');
    }
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, name, emails, photos } = profile;

    const user: OAuthProfile = {
      id: id,
      email: emails[0].value,
      firstName: name.givenName,
      lastName: name.familyName,
      avatar: photos[0]?.value,
      provider: 'google',
      providerId: id,
    };

    done(null, user);
  }
}
