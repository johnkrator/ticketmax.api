import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ResetPasswordDto } from './dto/reset-password';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { UserRole } from '../../enums/user-role';
import { JwtAuthGuard } from '../../configurations/jwt_configuration/jwt-auth-guard.service';
import { Roles } from '../../configurations/jwt_configuration/roles.decorator';
import {
  CacheKey,
  CacheTTL,
  CACHE_TIMES,
} from '../../configurations/cache-config/cache.decorators';
import {
  ThrottleAuth,
  ThrottleMedium,
  ThrottleShort,
  ThrottleSensitive,
} from '../../configurations/throttler-config/throttler.decorators';
import { AuthThrottlerGuard } from '../../configurations/throttler-config/throttler.guards';

@ApiTags('user')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('register')
  @UseGuards(AuthThrottlerGuard)
  @ThrottleAuth()
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  register(@Body() createUserDto: CreateUserDto) {
    return this.userService.register(createUserDto);
  }

  @Post('login')
  @UseGuards(AuthThrottlerGuard)
  @ThrottleAuth()
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  login(@Body() loginDto: LoginDto) {
    return this.userService.login(loginDto);
  }

  @Post('verify-email/:token')
  @UseGuards(AuthThrottlerGuard)
  @ThrottleSensitive()
  @ApiOperation({ summary: 'Verify email address' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  verifyEmail(@Param('token') token: string) {
    return this.userService.verifyEmail(token);
  }

  @Post('resend-verification')
  @UseGuards(AuthThrottlerGuard)
  @ThrottleSensitive()
  @ApiOperation({ summary: 'Resend verification email' })
  @ApiResponse({
    status: 200,
    description: 'Verification code resent successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({
    status: 400,
    description: 'Email already verified or account suspended',
  })
  resendVerification(@Body() resendVerificationDto: ResendVerificationDto) {
    return this.userService.resendVerificationCode(resendVerificationDto);
  }

  @Post('forgot-password')
  @UseGuards(AuthThrottlerGuard)
  @ThrottleSensitive()
  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({ status: 200, description: 'Password reset email sent' })
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.userService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  @UseGuards(AuthThrottlerGuard)
  @ThrottleSensitive()
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.userService.resetPassword(resetPasswordDto);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ThrottleMedium()
  @ApiOperation({ summary: 'Change password for authenticated user' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  changePassword(@Request() req, @Body() changePasswordDto: ChangePasswordDto) {
    return this.userService.changePassword(req.user.id, changePasswordDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  @ThrottleMedium()
  @CacheKey('users-all')
  @CacheTTL(CACHE_TIMES.SHORT)
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  findAll() {
    return this.userService.findAll();
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ThrottleShort()
  @CacheKey('user-profile')
  @CacheTTL(CACHE_TIMES.SHORT)
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
  })
  getProfile(@Request() req) {
    return this.userService.findOne(req.user.id);
  }

  @Get(':id')
  @ThrottleShort()
  @CacheKey('user-detail')
  @CacheTTL(CACHE_TIMES.MEDIUM)
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update user by ID' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete user by ID' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}
