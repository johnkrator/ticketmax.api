import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-facebook';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuthProfile } from '../auth.service';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  private isConfigured = false;

  constructor(private configService: ConfigService) {
    const clientID = configService.get<string>('FACEBOOK_APP_ID');
    const clientSecret = configService.get<string>('FACEBOOK_APP_SECRET');

    // Always call super with default values, but track if properly configured
    super({
      clientID:
        clientID && clientID !== 'your-facebook-app-id'
          ? clientID
          : 'dummy-client-id',
      clientSecret:
        clientSecret && clientSecret !== 'your-facebook-app-secret'
          ? clientSecret
          : 'dummy-client-secret',
      callbackURL:
        configService.get<string>('FACEBOOK_CALLBACK_URL') ||
        'http://localhost:3500/auth/facebook/callback',
      profileFields: ['id', 'emails', 'name', 'picture.type(large)'],
    });

    // Check if we have valid configuration
    this.isConfigured = !!(
      clientID &&
      clientID !== 'your-facebook-app-id' &&
      clientSecret &&
      clientSecret !== 'your-facebook-app-secret'
    );

    if (!this.isConfigured) {
      console.warn('Facebook OAuth not configured - using dummy credentials');
    }
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: any,
  ): Promise<any> {
    const { id, name, emails, photos } = profile;

    const user: OAuthProfile = {
      id: id,
      email: emails?.[0]?.value || `${id}@facebook.local`,
      firstName: name.givenName || 'Facebook',
      lastName: name.familyName || 'User',
      avatar: photos?.[0]?.value,
      provider: 'facebook',
      providerId: id,
    };

    done(null, user);
  }
}
