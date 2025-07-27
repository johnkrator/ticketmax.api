import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../user/entities/user.entity';
import { UserRole, UserStatus } from '../../enums/user-role';
import * as bcrypt from 'bcrypt';

export interface OAuthProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  provider: 'google' | 'github' | 'facebook' | 'apple';
  providerId: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
  ) {}

  async validateOAuthLogin(profile: OAuthProfile): Promise<any> {
    try {
      // Check if user exists with this email
      let user = await this.userModel.findOne({ email: profile.email });

      if (user) {
        // Update OAuth provider info if not already set
        if (
          !user.oauthProviders?.some((p) => p.provider === profile.provider)
        ) {
          user.oauthProviders = user.oauthProviders || [];
          user.oauthProviders.push({
            provider: profile.provider,
            providerId: profile.providerId,
            connectedAt: new Date(),
          });
          user.emailVerified = true; // OAuth emails are considered verified
          await user.save();
        }
      } else {
        // Create new user from OAuth profile
        const randomPassword = await bcrypt.hash(
          Math.random().toString(36),
          10,
        );

        user = new this.userModel({
          firstName: profile.firstName,
          lastName: profile.lastName,
          email: profile.email,
          password: randomPassword, // Random password since they'll use OAuth
          avatar: profile.avatar,
          role: UserRole.USER,
          status: UserStatus.ACTIVE,
          emailVerified: true,
          oauthProviders: [
            {
              provider: profile.provider,
              providerId: profile.providerId,
              connectedAt: new Date(),
            },
          ],
          lastLogin: new Date(),
        });

        await user.save();
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      return this.generateTokens(user);
    } catch (error) {
      throw new UnauthorizedException('OAuth authentication failed');
    }
  }

  private generateTokens(user: UserDocument) {
    const payload = {
      sub: user._id,
      email: user.email,
      role: user.role,
      status: user.status,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatar: user.avatar,
      },
    };
  }

  async linkOAuthProvider(
    userId: string,
    profile: OAuthProfile,
  ): Promise<void> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    user.oauthProviders = user.oauthProviders || [];

    // Check if provider is already linked
    const existingProvider = user.oauthProviders.find(
      (p) => p.provider === profile.provider,
    );

    if (!existingProvider) {
      user.oauthProviders.push({
        provider: profile.provider,
        providerId: profile.providerId,
        connectedAt: new Date(),
      });
      await user.save();
    }
  }

  async unlinkOAuthProvider(userId: string, provider: string): Promise<void> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Don't allow unlinking if it's the only authentication method
    if (user.oauthProviders?.length === 1 && !user.password) {
      throw new UnauthorizedException(
        'Cannot unlink the only authentication method',
      );
    }

    user.oauthProviders =
      user.oauthProviders?.filter((p) => p.provider !== provider) || [];

    await user.save();
  }
}
