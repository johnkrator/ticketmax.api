import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuthProfile } from '../auth.service';

@Injectable()
export class GitHubStrategy extends PassportStrategy(Strategy, 'github') {
  private isConfigured = false;

  constructor(private configService: ConfigService) {
    const clientID = configService.get<string>('GITHUB_CLIENT_ID');
    const clientSecret = configService.get<string>('GITHUB_CLIENT_SECRET');

    // Always call super with default values, but track if properly configured
    super({
      clientID:
        clientID && clientID !== 'your-github-client-id'
          ? clientID
          : 'dummy-client-id',
      clientSecret:
        clientSecret && clientSecret !== 'your-github-client-secret'
          ? clientSecret
          : 'dummy-client-secret',
      callbackURL:
        configService.get<string>('GITHUB_CALLBACK_URL') ||
        'http://localhost:3500/auth/github/callback',
      scope: ['user:email'],
    });

    // Check if we have valid configuration
    this.isConfigured = !!(
      clientID &&
      clientID !== 'your-github-client-id' &&
      clientSecret &&
      clientSecret !== 'your-github-client-secret'
    );

    if (!this.isConfigured) {
      console.warn('GitHub OAuth not configured - using dummy credentials');
    }
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: any,
  ): Promise<any> {
    const { id, username, emails, photos, displayName } = profile;

    // GitHub might not provide name, so we'll use displayName or username
    const fullName = displayName || username || '';
    const nameParts = fullName.split(' ');
    const firstName = nameParts[0] || username || 'GitHub';
    const lastName = nameParts.slice(1).join(' ') || 'User';

    const user: OAuthProfile = {
      id: id,
      email: emails?.[0]?.value || `${username}@github.local`,
      firstName,
      lastName,
      avatar: photos?.[0]?.value,
      provider: 'github',
      providerId: id.toString(),
    };

    done(null, user);
  }
}
