import {
  Controller,
  Get,
  Post,
  UseGuards,
  Req,
  Query,
  Body,
  Sse,
  MessageEvent,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import {
  TicketVerificationService,
  TicketVerificationResult,
} from './ticket-verification.service';
import { AuthenticatedRequest } from '../../interfaces/auth.interface';
import { Observable } from 'rxjs';
import { DashboardStatsDto, DashboardFiltersDto } from './dto/dashboard.dto';
import { JwtAuthGuard } from '../../configurations/jwt_configuration/jwt-auth-guard.service';

@ApiTags('Dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly ticketVerificationService: TicketVerificationService,
  ) {}

  private getUserId(req: AuthenticatedRequest): string {
    if (!req.user?.id) {
      throw new UnauthorizedException('User not authenticated');
    }
    return req.user.id;
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard stats retrieved successfully',
    type: DashboardStatsDto,
  })
  async getDashboardStats(
    @Req() req: AuthenticatedRequest,
    @Query() filters: DashboardFiltersDto,
  ): Promise<DashboardStatsDto> {
    const userId = this.getUserId(req);
    return this.dashboardService.getDashboardStats(userId, filters);
  }

  @Get('user-tickets')
  @ApiOperation({ summary: 'Get user tickets with pagination' })
  @ApiResponse({
    status: 200,
    description: 'User tickets retrieved successfully',
  })
  async getUserTickets(
    @Req() req: AuthenticatedRequest,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status') status?: string,
  ) {
    const userId = this.getUserId(req);
    return this.dashboardService.getUserTickets(userId, page, limit, status);
  }

  @Get('user-events')
  @ApiOperation({ summary: 'Get organizer events with pagination' })
  @ApiResponse({
    status: 200,
    description: 'User events retrieved successfully',
  })
  async getUserEvents(
    @Req() req: AuthenticatedRequest,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status') status?: string,
  ) {
    const userId = this.getUserId(req);
    return this.dashboardService.getUserEvents(userId, page, limit, status);
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get detailed analytics data' })
  @ApiResponse({
    status: 200,
    description: 'Analytics data retrieved successfully',
  })
  async getAnalytics(
    @Req() req: AuthenticatedRequest,
    @Query() filters: DashboardFiltersDto,
  ) {
    const userId = this.getUserId(req);
    return this.dashboardService.getAnalytics(userId, filters);
  }

  @Sse('stats-stream')
  @ApiOperation({ summary: 'Real-time dashboard stats stream' })
  @ApiResponse({
    status: 200,
    description: 'Server-sent events stream for real-time stats',
  })
  getStatsStream(@Req() req: AuthenticatedRequest): Observable<MessageEvent> {
    const userId = this.getUserId(req);
    return this.dashboardService.getStatsStream(userId);
  }

  @Get('recent-activities')
  @ApiOperation({ summary: 'Get recent user activities' })
  @ApiResponse({
    status: 200,
    description: 'Recent activities retrieved successfully',
  })
  async getRecentActivities(
    @Req() req: AuthenticatedRequest,
    @Query('limit') limit: number = 20,
  ) {
    const userId = this.getUserId(req);
    return this.dashboardService.getRecentActivities(userId, limit);
  }

  @Post('verify-ticket')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify ticket using QR code data' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        qrData: { type: 'string', description: 'QR code data to verify' },
      },
      required: ['qrData'],
    },
  })
  @ApiResponse({ status: 200, description: 'Ticket verification result' })
  async verifyTicketByQR(
    @Body('qrData') qrData: string,
  ): Promise<TicketVerificationResult> {
    return this.ticketVerificationService.verifyTicketByQR(qrData);
  }

  @Post('verify-ticket-number')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify ticket using ticket number' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        ticketNumber: {
          type: 'string',
          description: 'Ticket number to verify',
        },
      },
      required: ['ticketNumber'],
    },
  })
  @ApiResponse({ status: 200, description: 'Ticket verification result' })
  async verifyTicketByNumber(
    @Body('ticketNumber') ticketNumber: string,
  ): Promise<TicketVerificationResult> {
    return this.ticketVerificationService.verifyTicketByNumber(ticketNumber);
  }

  @Delete('cache/:userId')
  @ApiOperation({ summary: 'Invalidate cache for specific user (admin only)' })
  @ApiParam({ name: 'userId', description: 'User ID to invalidate cache for' })
  @ApiResponse({ status: 200, description: 'Cache invalidated successfully' })
  async invalidateUserCache(
    @Param('userId') userId: string,
  ): Promise<{ message: string }> {
    await this.dashboardService.invalidateUserCache(userId);
    return { message: 'Cache invalidated successfully' };
  }

  @Get('health')
  @ApiOperation({ summary: 'Get dashboard service health status' })
  @ApiResponse({ status: 200, description: 'Service health information' })
  async getHealthStatus() {
    const health = await this.dashboardService.getConnectionHealth();
    return {
      status: 'healthy',
      timestamp: new Date(),
      ...health,
    };
  }

  @Get('verification-stats')
  @ApiOperation({ summary: 'Get ticket verification statistics' })
  @ApiResponse({
    status: 200,
    description: 'Verification statistics retrieved successfully',
  })
  async getVerificationStats(
    @Req() req: AuthenticatedRequest,
    @Query('eventId') eventId?: string,
  ) {
    const organizerId = this.getUserId(req);
    return this.ticketVerificationService.getVerificationStats(
      organizerId,
      eventId,
    );
  }
}
