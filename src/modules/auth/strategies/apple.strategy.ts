import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-apple';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuthProfile } from '../auth.service';

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
  private isConfigured = false;

  constructor(private configService: ConfigService) {
    const clientID = configService.get<string>('APPLE_CLIENT_ID');
    const teamID = configService.get<string>('APPLE_TEAM_ID');
    const keyID = configService.get<string>('APPLE_KEY_ID');
    const privateKey = configService.get<string>('APPLE_PRIVATE_KEY');

    // Always call super with default values, but track if properly configured
    super({
      clientID:
        clientID && clientID !== 'your-apple-service-id'
          ? clientID
          : 'dummy-client-id',
      teamID:
        teamID && teamID !== 'your-apple-team-id' ? teamID : 'dummy-team-id',
      keyID: keyID && keyID !== 'your-apple-key-id' ? keyID : 'dummy-key-id',
      privateKeyString:
        privateKey && !privateKey.includes('Your Apple private key here')
          ? privateKey
          : '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7VJTUt9Us8cKB\n-----END PRIVATE KEY-----',
      callbackURL:
        configService.get<string>('APPLE_CALLBACK_URL') ||
        'http://localhost:3500/auth/apple/callback',
      scope: ['name', 'email'],
    });

    // Check if we have valid configuration
    this.isConfigured = !!(
      clientID &&
      clientID !== 'your-apple-service-id' &&
      teamID &&
      teamID !== 'your-apple-team-id' &&
      keyID &&
      keyID !== 'your-apple-key-id' &&
      privateKey &&
      !privateKey.includes('Your Apple private key here')
    );

    if (!this.isConfigured) {
      console.warn('Apple OAuth not configured - using dummy credentials');
    }
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    idToken: any,
    profile: any,
    done: any,
  ): Promise<any> {
    const { sub, email, email_verified } = idToken;

    // Apple provides name only on first authorization
    const firstName = profile?.name?.firstName || 'Apple';
    const lastName = profile?.name?.lastName || 'User';

    const user: OAuthProfile = {
      id: sub,
      email: email || `${sub}@apple.local`,
      firstName,
      lastName,
      provider: 'apple',
      providerId: sub,
    };

    done(null, user);
  }
}
