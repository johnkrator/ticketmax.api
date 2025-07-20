import { Controller, Post, Body, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';
import { EmailSendService } from './email-send.service';

class TestEmailDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  name?: string;
}

@ApiTags('email')
@Controller('email-send')
export class EmailSendController {
  constructor(private readonly emailSendService: EmailSendService) {}

  @Get('test-config')
  @ApiOperation({ summary: 'Test email configuration' })
  @ApiResponse({ status: 200, description: 'Email configuration test result' })
  async testEmailConfiguration() {
    const isValid = await this.emailSendService.testEmailConfiguration();
    return {
      success: isValid,
      message: isValid
        ? 'Email configuration is valid'
        : 'Email configuration failed - check logs for details',
    };
  }

  @Post('test-send')
  @ApiOperation({ summary: 'Send a test email' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email', example: 'test@example.com' },
        name: { type: 'string', example: 'Test User' },
      },
      required: ['email'],
    },
  })
  @ApiResponse({ status: 200, description: 'Test email sent' })
  async sendTestEmail(@Body() body: TestEmailDto) {
    if (!body || !body.email) {
      return {
        success: false,
        message: 'Email address is required',
        details: null,
      };
    }

    const result = await this.emailSendService.sendVerificationEmail(
      body.email,
      '123456',
      body.name || 'Test User',
    );

    return {
      success: result.success,
      message: result.success
        ? `Test email sent successfully to ${body.email}`
        : `Failed to send test email: ${result.error}`,
      details: result,
    };
  }
}
