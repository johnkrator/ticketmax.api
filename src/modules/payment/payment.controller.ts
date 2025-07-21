import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiHeader,
} from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { InitiatePaymentDto, PaymentWebhookDto } from './dto/payment.dto';
import { JwtAuthGuard } from '../../configurations/jwt_configuration/jwt-auth-guard.service';

@ApiTags('Payments')
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('initiate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate payment for a booking' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Payment initiated successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid payment data or booking not found',
  })
  async initiatePayment(
    @Body() initiatePaymentDto: InitiatePaymentDto,
    @Request() req,
  ) {
    const userId = req.user.userId;
    return await this.paymentService.initiatePayment(
      initiatePaymentDto,
      userId,
    );
  }

  @Get('verify/:reference')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify payment status' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment verified successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Payment not found',
  })
  async verifyPayment(@Param('reference') reference: string) {
    return await this.paymentService.verifyPayment(reference);
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Handle Paystack webhooks' })
  @ApiHeader({
    name: 'x-paystack-signature',
    description: 'Paystack webhook signature',
    required: true,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Webhook processed successfully',
  })
  async handleWebhook(
    @Body() payload: any,
    @Headers('x-paystack-signature') signature: string,
  ) {
    await this.paymentService.handleWebhook(payload, signature);
    return { message: 'Webhook processed successfully' };
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user payment history' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment history retrieved successfully',
  })
  async getUserPayments(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Request() req,
  ) {
    const userId = req.user.userId;
    return await this.paymentService.getUserPayments(
      userId,
      parseInt(page),
      parseInt(limit),
    );
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user payment statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment statistics retrieved successfully',
  })
  async getPaymentStats(@Request() req) {
    const userId = req.user.userId;
    return await this.paymentService.getPaymentStats(userId);
  }
}
