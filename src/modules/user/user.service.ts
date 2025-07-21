import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { UserRole, UserStatus } from '../../enums/user-role';
import { JwtConfigService } from '../../configurations/jwt_configuration/jwt.config.service';
import { ResetPasswordDto } from './dto/reset-password';
import { EmailSendService } from '../../middleware/email-send/email-send.service';
import { SmsSendService } from '../../middleware/sms-send/sms-send.service';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private jwtConfigService: JwtConfigService,
    private emailService: EmailSendService,
    private smsService: SmsSendService,
  ) {}

  async register(createUserDto: CreateUserDto) {
    const existingUser = await this.userModel.findOne({
      email: createUserDto.email,
    });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 12);
    const emailVerificationToken = this.jwtConfigService.generateSixDigitCode();

    const user = new this.userModel({
      ...createUserDto,
      password: hashedPassword,
      emailVerificationToken,
      role: createUserDto.role || UserRole.USER, // This ensures uppercase USER
      status: UserStatus.INACTIVE,
    });

    const savedUser = await user.save();

    // Send verification email with proper error handling
    try {
      const emailResult = await this.emailService.sendVerificationEmail(
        savedUser.email,
        emailVerificationToken,
        savedUser.firstName,
      );

      if (!emailResult.success) {
        console.error('Failed to send verification email:', emailResult.error);
      }
    } catch (error) {
      console.error('Error sending verification email:', error);
    }

    return {
      message: 'User registered successfully. Please verify your email.',
      userId: savedUser._id,
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.userModel.findOne({ email: loginDto.email });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('Account is suspended');
    }

    if (user.isLocked) {
      throw new UnauthorizedException('Account is temporarily locked');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      await this.handleFailedLogin(user);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.emailVerified) {
      throw new UnauthorizedException(
        'Please verify your email before logging in',
      );
    }

    await this.handleSuccessfulLogin(user);

    const payload = {
      sub: user._id,
      email: user.email,
      role: user.role,
      status: user.status,
    };

    return {
      access_token: this.jwtConfigService.generateAccessToken(payload),
      refresh_token: this.jwtConfigService.generateRefreshToken(payload),
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
      },
    };
  }

  async verifyEmail(token: string) {
    const user = await this.userModel.findOne({
      emailVerificationToken: token,
    });
    if (!user) {
      throw new BadRequestException('Invalid verification token');
    }

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.status = UserStatus.ACTIVE;
    await user.save();

    return { message: 'Email verified successfully' };
  }

  async resendVerificationCode(resendVerificationDto: ResendVerificationDto) {
    const user = await this.userModel.findOne({
      email: resendVerificationDto.email,
    });

    if (!user) {
      throw new NotFoundException('User with this email does not exist');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new BadRequestException('Account is suspended');
    }

    // Generate a new verification token
    const emailVerificationToken = this.jwtConfigService.generateSixDigitCode();

    user.emailVerificationToken = emailVerificationToken;
    await user.save();

    // Send verification email with proper error handling
    try {
      const emailResult = await this.emailService.sendVerificationEmail(
        user.email,
        emailVerificationToken,
        user.firstName,
      );

      if (!emailResult.success) {
        console.error('Failed to send verification email:', emailResult.error);
        throw new BadRequestException(
          'Failed to send verification email. Please try again.',
        );
      }
    } catch (error) {
      console.error('Error sending verification email:', error);
      throw new BadRequestException(
        'Failed to send verification email. Please try again.',
      );
    }

    return {
      message: 'Verification code has been resent to your email address',
    };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    console.log('Forgot password called for email:', forgotPasswordDto.email);

    const user = await this.userModel.findOne({
      email: forgotPasswordDto.email,
    });

    if (!user) {
      console.log('User not found for email:', forgotPasswordDto.email);
      // Don't reveal if email exists
      return { message: 'If the email exists, a reset link has been sent' };
    }

    console.log('User found:', user.firstName, user.email);

    const resetToken = this.jwtConfigService.generateSixDigitCode();
    const resetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    console.log('Generated reset token:', resetToken);

    user.passwordResetToken = resetToken;
    user.passwordResetExpires = resetExpires;
    await user.save();

    console.log('User saved with reset token');

    // Send reset password email with proper error handling
    try {
      console.log('Attempting to send password reset email to:', user.email);

      const emailResult = await this.emailService.sendPasswordResetEmail(
        user.email,
        resetToken,
        user.firstName,
      );

      console.log('Email service result:', emailResult);

      if (!emailResult.success) {
        console.error(
          'Failed to send password reset email:',
          emailResult.error,
        );
        // Still return success message to not reveal if email exists
        // but log the error for debugging
      } else {
        console.log('Password reset email sent successfully');
      }
    } catch (error) {
      console.error('Error sending password reset email:', error);
      console.error('Error stack:', error.stack);
      // Don't throw the error to avoid revealing if email exists
      // but log it for debugging
    }

    return { message: 'If the email exists, a reset link has been sent' };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const user = await this.userModel.findOne({
      passwordResetToken: resetPasswordDto.token,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(resetPasswordDto.newPassword, 12);
    user.password = hashedPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.loginAttempts = 0;
    user.lockUntil = undefined;
    await user.save();

    return { message: 'Password reset successfully' };
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.password,
    );
    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const hashedNewPassword = await bcrypt.hash(
      changePasswordDto.newPassword,
      12,
    );
    user.password = hashedNewPassword;
    await user.save();

    return { message: 'Password changed successfully' };
  }

  async findAll() {
    return this.userModel
      .find()
      .select('-password -passwordResetToken -emailVerificationToken');
  }

  async findOne(id: string) {
    const user = await this.userModel
      .findById(id)
      .select('-password -passwordResetToken -emailVerificationToken');
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.userModel
      .findByIdAndUpdate(id, updateUserDto, { new: true })
      .select('-password -passwordResetToken -emailVerificationToken');

    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async remove(id: string) {
    const user = await this.userModel.findByIdAndDelete(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return { message: 'User deleted successfully' };
  }

  // Test email configuration
  async testEmailConfiguration(): Promise<boolean> {
    return this.emailService.testEmailConfiguration();
  }

  // Find user by email (helper method)
  async findByEmail(email: string) {
    return this.userModel.findOne({ email });
  }

  private async handleFailedLogin(user: any) {
    await this.userModel.updateOne(
      { _id: user._id },
      {
        $inc: { loginAttempts: 1 },
        $set:
          user.loginAttempts >= 4
            ? { lockUntil: new Date(Date.now() + 1 * 60 * 1000) }
            : {},
      },
    );
  }

  private async handleSuccessfulLogin(user: any) {
    await this.userModel.updateOne(
      { _id: user._id },
      {
        $unset: { lockUntil: 1 },
        $set: {
          loginAttempts: 0,
          lastLogin: new Date(),
        },
      },
    );
  }
}
