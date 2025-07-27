import {
  Controller,
  Get,
  Post,
  UseGuards,
  Req,
  Res,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../../configurations/jwt_configuration/jwt-auth-guard.service';

@ApiTags('OAuth Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Google OAuth
  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  async googleAuth(@Req() req: Request) {
    // Guard redirects to Google
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback' })
  async googleAuthRedirect(@Req() req: any, @Res() res: Response) {
    const result = await this.authService.validateOAuthLogin(req.user);
    return this.handleOAuthRedirect(res, result);
  }

  // GitHub OAuth
  @Get('github')
  @UseGuards(AuthGuard('github'))
  @ApiOperation({ summary: 'Initiate GitHub OAuth login' })
  async githubAuth(@Req() req: Request) {
    // Guard redirects to GitHub
  }

  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  @ApiOperation({ summary: 'GitHub OAuth callback' })
  async githubAuthRedirect(@Req() req: any, @Res() res: Response) {
    const result = await this.authService.validateOAuthLogin(req.user);
    return this.handleOAuthRedirect(res, result);
  }

  // Facebook OAuth
  @Get('facebook')
  @UseGuards(AuthGuard('facebook'))
  @ApiOperation({ summary: 'Initiate Facebook OAuth login' })
  async facebookAuth(@Req() req: Request) {
    // Guard redirects to Facebook
  }

  @Get('facebook/callback')
  @UseGuards(AuthGuard('facebook'))
  @ApiOperation({ summary: 'Facebook OAuth callback' })
  async facebookAuthRedirect(@Req() req: any, @Res() res: Response) {
    const result = await this.authService.validateOAuthLogin(req.user);
    return this.handleOAuthRedirect(res, result);
  }

  // Apple OAuth
  @Get('apple')
  @UseGuards(AuthGuard('apple'))
  @ApiOperation({ summary: 'Initiate Apple OAuth login' })
  async appleAuth(@Req() req: Request) {
    // Guard redirects to Apple
  }

  @Post('apple/callback')
  @UseGuards(AuthGuard('apple'))
  @ApiOperation({ summary: 'Apple OAuth callback' })
  async appleAuthRedirect(@Req() req: any, @Res() res: Response) {
    const result = await this.authService.validateOAuthLogin(req.user);
    return this.handleOAuthRedirect(res, result);
  }

  // Link OAuth provider to existing account
  @Post('link/:provider')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Link OAuth provider to existing account' })
  async linkProvider(@Req() req: any, @Query('provider') provider: string) {
    const userId = req.user.id;
    // This would need to be implemented with a temporary session
    // to complete the OAuth flow and link to existing account
    return { message: `Initiate linking ${provider} provider` };
  }

  // Unlink OAuth provider
  @Post('unlink/:provider')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Unlink OAuth provider from account' })
  async unlinkProvider(@Req() req: any, @Query('provider') provider: string) {
    const userId = req.user.id;
    await this.authService.unlinkOAuthProvider(userId, provider);
    return { message: `${provider} provider unlinked successfully` };
  }

  // Get linked OAuth providers
  @Get('providers')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get linked OAuth providers' })
  async getLinkedProviders(@Req() req: any) {
    // This would query the user's linked providers
    return { providers: [] }; // Implementation depends on user service
  }

  private handleOAuthRedirect(res: Response, result: any) {
    // In production, you might want to redirect to your frontend with the token
    // For now, we'll return JSON response
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const redirectUrl = `${frontendUrl}/auth/callback?token=${result.access_token}`;

    return res.redirect(redirectUrl);
  }
}
