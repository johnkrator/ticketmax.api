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
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiHeader,
  ApiParam,
} from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { InitiatePaymentDto } from './dto/payment.dto';
import { JwtAuthGuard } from '../../configurations/jwt_configuration/jwt-auth-guard.service';
import { PaymentGateway } from './entities/payment.entity';

@ApiTags('Payments')
@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('initiate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Initiate payment for a booking',
    description:
      'Create a payment transaction for a booking using either Paystack or Flutterwave',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Payment initiated successfully',
    schema: {
      type: 'object',
      properties: {
        authorization_url: {
          type: 'string',
          description: 'Payment URL to redirect user',
        },
        access_code: {
          type: 'string',
          description: 'Paystack access code (if using Paystack)',
        },
        reference: {
          type: 'string',
          description: 'Payment reference for tracking',
        },
        gateway: {
          type: 'string',
          enum: ['paystack', 'flutterwave'],
          description: 'Payment gateway used',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid payment data or booking not found',
  })
  async initiatePayment(
    @Body() initiatePaymentDto: InitiatePaymentDto,
    @Request() req,
  ) {
    const userId = req.user.id; // Fixed: changed from req.user.userId to req.user.id
    return await this.paymentService.initiatePayment(
      initiatePaymentDto,
      userId,
    );
  }

  @Get('verify/:reference')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Verify payment status',
    description:
      'Verify the status of a payment transaction using its reference',
  })
  @ApiParam({ name: 'reference', description: 'Payment reference to verify' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment verification successful',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Payment not found',
  })
  async verifyPayment(@Param('reference') reference: string) {
    return await this.paymentService.verifyPayment(reference);
  }

  @Post('webhook/paystack')
  @ApiOperation({
    summary: 'Paystack webhook endpoint',
    description:
      'Handle Paystack webhook notifications for payment status updates',
  })
  @ApiHeader({
    name: 'x-paystack-signature',
    description: 'Paystack webhook signature for verification',
    required: true,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Webhook processed successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid webhook signature or payload',
  })
  async handlePaystackWebhook(
    @Body() payload: any,
    @Headers('x-paystack-signature') signature: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing webhook signature');
    }

    await this.paymentService.handleWebhook(
      payload,
      signature,
      PaymentGateway.PAYSTACK,
    );

    return { status: 'success' };
  }

  @Post('webhook/flutterwave')
  @ApiOperation({
    summary: 'Flutterwave webhook endpoint',
    description:
      'Handle Flutterwave webhook notifications for payment status updates',
  })
  @ApiHeader({
    name: 'verif-hash',
    description: 'Flutterwave webhook hash for verification',
    required: true,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Webhook processed successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid webhook signature or payload',
  })
  async handleFlutterwaveWebhook(
    @Body() payload: any,
    @Headers('verif-hash') signature: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing webhook signature');
    }

    await this.paymentService.handleWebhook(
      payload,
      signature,
      PaymentGateway.FLUTTERWAVE,
    );

    return { status: 'success' };
  }

  @Get('user/history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get user payment history',
    description:
      'Retrieve paginated payment history for the authenticated user',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment history retrieved successfully',
  })
  async getUserPaymentHistory(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const userId = req.user.id; // Fixed: changed from req.user.userId to req.user.id
    return await this.paymentService.getUserPayments(
      userId,
      page || 1,
      limit || 10,
    );
  }

  @Get('user/stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get user payment statistics',
    description:
      'Retrieve payment statistics and analytics for the authenticated user',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalPayments: {
          type: 'number',
          description: 'Total number of payments',
        },
        totalSpent: {
          type: 'number',
          description: 'Total amount spent in Naira',
        },
        byStatus: {
          type: 'object',
          description: 'Payment statistics grouped by status',
          additionalProperties: {
            type: 'object',
            properties: {
              count: { type: 'number' },
              amount: { type: 'number' },
            },
          },
        },
      },
    },
  })
  async getUserPaymentStats(@Request() req) {
    const userId = req.user.id; // Fixed: changed from req.user.userId to req.user.id
    return await this.paymentService.getPaymentStats(userId);
  }

  @Get('gateways/status')
  @ApiOperation({
    summary: 'Get payment gateways status',
    description: 'Check which payment gateways are available and configured',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Gateway status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        paystack: {
          type: 'object',
          properties: {
            available: { type: 'boolean' },
            name: { type: 'string' },
          },
        },
        flutterwave: {
          type: 'object',
          properties: {
            available: { type: 'boolean' },
            name: { type: 'string' },
          },
        },
      },
    },
  })
  async getGatewaysStatus() {
    // This would typically check if the gateways are properly configured
    return {
      paystack: {
        available: true,
        name: 'Paystack',
        description: 'Card, Bank Transfer, USSD, Mobile Money',
      },
      flutterwave: {
        available: true,
        name: 'Flutterwave',
        description: 'Card, Bank Transfer, USSD, Mobile Money',
      },
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get payment details',
    description: 'Retrieve detailed information about a specific payment',
  })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment details retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Payment not found',
  })
  async getPaymentDetails(@Param('id') paymentId: string, @Request() req) {
    const userId = req.user.userId;
    // This would need to be implemented in the service
    // return await this.paymentService.getPaymentById(paymentId, userId);
    throw new BadRequestException('Method not implemented yet');
  }
}
