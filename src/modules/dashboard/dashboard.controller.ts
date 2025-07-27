import {
  Controller,
  Get,
  Post,
  UseGuards,
  Req,
  Query,
  Sse,
  MessageEvent,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiOkResponse,
} from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import {
  TicketVerificationService,
  TicketVerificationResult,
} from './ticket-verification.service';
import { AuthenticatedRequest } from '../../interfaces/auth.interface';
import { Observable } from 'rxjs';
import {
  DashboardStatsDto,
  DashboardFiltersDto,
  UserTicketDto,
  UserEventDto,
  PaginationDto,
  RevenueAnalyticsDto,
  EventPerformanceDto,
  CustomerInsightsDto,
  SalesTimelineDto,
  TopCategoriesDto,
  GetTicketsQueryDto,
  GetEventsQueryDto,
  GetAnalyticsQueryDto,
  GetTimelineQueryDto,
  DashboardPeriod,
} from './dto/dashboard.dto';
import { JwtAuthGuard } from '../../configurations/jwt_configuration/jwt-auth-guard.service';

/**
 * Dashboard Controller - Comprehensive dashboard and analytics API
 *
 * Provides endpoints for:
 * - Dashboard statistics and KPIs
 * - User ticket management
 * - Event analytics and performance
 * - Revenue analytics and insights
 * - Customer behavior analysis
 * - Real-time updates via Server-Sent Events
 * - Ticket verification and management
 *
 * All endpoints require JWT authentication and return detailed,
 * well-structured data with proper error handling.
 */
@ApiTags('Dashboard')
@Controller('dashboard')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@UsePipes(new ValidationPipe({ transform: true }))
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
  @ApiOperation({
    summary: 'Get comprehensive dashboard statistics',
    description:
      'Returns detailed dashboard KPIs including tickets, events, revenue, and growth metrics with intelligent caching',
  })
  @ApiOkResponse({
    description: 'Dashboard statistics retrieved successfully',
    type: DashboardStatsDto,
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Filter start date (ISO format)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'Filter end date (ISO format)',
  })
  @ApiQuery({
    name: 'period',
    enum: DashboardPeriod,
    required: false,
    description: 'Time period filter',
  })
  async getDashboardStats(
    @Req() req: AuthenticatedRequest,
    @Query() filters: DashboardFiltersDto,
  ): Promise<DashboardStatsDto> {
    const userId = this.getUserId(req);
    return this.dashboardService.getDashboardStats(userId, filters);
  }

  @Get('tickets')
  @ApiOperation({
    summary: 'Get user tickets with pagination',
    description:
      'Returns paginated list of user tickets with detailed event information and QR codes',
  })
  @ApiOkResponse({
    description: 'User tickets retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        tickets: {
          type: 'array',
          items: { $ref: '#/components/schemas/UserTicketDto' },
        },
        pagination: { $ref: '#/components/schemas/PaginationDto' },
      },
    },
  })
  async getUserTickets(
    @Req() req: AuthenticatedRequest,
    @Query() query: GetTicketsQueryDto,
  ): Promise<{ tickets: UserTicketDto[]; pagination: PaginationDto }> {
    const userId = this.getUserId(req);
    return this.dashboardService.getUserTickets(
      userId,
      query.page,
      query.limit,
      query.status,
      query.eventId,
    );
  }

  @Get('events')
  @ApiOperation({
    summary: 'Get user events with analytics',
    description:
      'Returns paginated list of user events with comprehensive performance metrics and sales data',
  })
  @ApiOkResponse({
    description: 'User events retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        events: {
          type: 'array',
          items: { $ref: '#/components/schemas/UserEventDto' },
        },
        pagination: { $ref: '#/components/schemas/PaginationDto' },
      },
    },
  })
  async getUserEvents(
    @Req() req: AuthenticatedRequest,
    @Query() query: GetEventsQueryDto,
  ): Promise<{ events: UserEventDto[]; pagination: PaginationDto }> {
    const userId = this.getUserId(req);
    const filters: DashboardFiltersDto = {
      startDate: query.startDate,
      endDate: query.endDate,
      period: query.period,
      category: query.category,
    };

    return this.dashboardService.getUserEvents(
      userId,
      query.page,
      query.limit,
      filters,
    );
  }

  @Get('analytics/revenue')
  @ApiOperation({
    summary: 'Get comprehensive revenue analytics',
    description:
      'Returns detailed revenue analysis including trends, forecasts, and category breakdowns',
  })
  @ApiOkResponse({
    description: 'Revenue analytics retrieved successfully',
    type: RevenueAnalyticsDto,
  })
  async getRevenueAnalytics(
    @Req() req: AuthenticatedRequest,
    @Query() query: GetAnalyticsQueryDto,
  ): Promise<RevenueAnalyticsDto> {
    const userId = this.getUserId(req);
    return this.dashboardService.getRevenueAnalytics(userId, query.period);
  }

  @Get('analytics/events')
  @ApiOperation({
    summary: 'Get event performance analytics',
    description:
      'Returns performance metrics for events including conversion rates, sales velocity, and attendance data',
  })
  @ApiOkResponse({
    description: 'Event performance analytics retrieved successfully',
    type: [EventPerformanceDto],
  })
  async getEventPerformance(
    @Req() req: AuthenticatedRequest,
    @Query() query: GetAnalyticsQueryDto,
  ): Promise<EventPerformanceDto[]> {
    const userId = this.getUserId(req);
    return this.dashboardService.getEventPerformance(userId, query.eventId);
  }

  @Get('analytics/customers')
  @ApiOperation({
    summary: 'Get customer insights and behavior analytics',
    description:
      'Returns detailed customer analysis including demographics, behavior patterns, and lifetime value',
  })
  @ApiOkResponse({
    description: 'Customer insights retrieved successfully',
    type: CustomerInsightsDto,
  })
  async getCustomerInsights(
    @Req() req: AuthenticatedRequest,
  ): Promise<CustomerInsightsDto> {
    const userId = this.getUserId(req);
    return this.dashboardService.getCustomerInsights(userId);
  }

  @Get('analytics/timeline')
  @ApiOperation({
    summary: 'Get sales timeline for forecasting',
    description:
      'Returns daily sales data over specified period for trend analysis and forecasting',
  })
  @ApiOkResponse({
    description: 'Sales timeline retrieved successfully',
    type: [SalesTimelineDto],
  })
  async getSalesTimeline(
    @Req() req: AuthenticatedRequest,
    @Query() query: GetTimelineQueryDto,
  ): Promise<SalesTimelineDto[]> {
    const userId = this.getUserId(req);
    return this.dashboardService.getSalesTimeline(userId, query.days);
  }

  @Get('analytics/categories')
  @ApiOperation({
    summary: 'Get top performing categories',
    description:
      'Returns category performance rankings with revenue and market share analysis',
  })
  @ApiOkResponse({
    description: 'Top categories retrieved successfully',
    type: [TopCategoriesDto],
  })
  async getTopCategories(
    @Req() req: AuthenticatedRequest,
  ): Promise<TopCategoriesDto[]> {
    const userId = this.getUserId(req);
    return this.dashboardService.getTopCategories(userId);
  }

  @Sse('updates')
  @ApiOperation({
    summary: 'Get real-time dashboard updates',
    description:
      'Server-Sent Events stream providing real-time dashboard statistics updates',
  })
  @ApiResponse({
    status: 200,
    description: 'Real-time updates stream established',
    content: {
      'text/event-stream': {
        schema: {
          type: 'string',
          example: 'data: {"myTickets": 5, "revenue": 1500, ...}\n\n',
        },
      },
    },
  })
  getRealtimeUpdates(
    @Req() req: AuthenticatedRequest,
  ): Observable<MessageEvent> {
    const userId = this.getUserId(req);
    return this.dashboardService.getRealtimeUpdates(userId);
  }

  @Get('tickets/:ticketId/verify')
  @ApiOperation({
    summary: 'Verify ticket authenticity',
    description:
      'Verifies ticket using QR code data and returns verification status with event details',
  })
  @ApiParam({ name: 'ticketId', description: 'Ticket ID to verify' })
  @ApiOkResponse({
    description: 'Ticket verification completed',
    schema: {
      type: 'object',
      properties: {
        isValid: { type: 'boolean', description: 'Whether ticket is valid' },
        ticketInfo: { type: 'object', description: 'Ticket details if valid' },
        verificationTime: { type: 'string', format: 'date-time' },
        status: { type: 'string', description: 'Verification status' },
      },
    },
  })
  async verifyTicket(
    @Param('ticketId') ticketId: string,
    @Query('qrData') qrData?: string,
  ): Promise<TicketVerificationResult> {
    return this.ticketVerificationService.verifyTicket(ticketId, qrData);
  }

  @Post('tickets/:ticketId/checkin')
  @ApiOperation({
    summary: 'Check in ticket at event',
    description: 'Marks ticket as checked in for event attendance tracking',
  })
  @ApiParam({ name: 'ticketId', description: 'Ticket ID to check in' })
  @ApiOkResponse({
    description: 'Ticket checked in successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        checkedInAt: { type: 'string', format: 'date-time' },
        attendeeInfo: { type: 'object' },
      },
    },
  })
  @HttpCode(HttpStatus.OK)
  async checkInTicket(
    @Param('ticketId') ticketId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ success: boolean; checkedInAt: Date; attendeeInfo: any }> {
    const userId = this.getUserId(req);
    return this.ticketVerificationService.checkInTicket(ticketId, userId);
  }

  @Get('tickets/:ticketId/download')
  @ApiOperation({
    summary: 'Download ticket PDF',
    description: 'Generates and returns downloadable PDF ticket with QR code',
  })
  @ApiParam({ name: 'ticketId', description: 'Ticket ID to download' })
  @ApiResponse({
    status: 200,
    description: 'Ticket PDF generated successfully',
    content: {
      'application/pdf': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async downloadTicket(
    @Param('ticketId') ticketId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<Buffer> {
    const userId = this.getUserId(req);
    return this.ticketVerificationService.generateTicketPDF(ticketId, userId);
  }

  @Delete('tickets/:ticketId/cancel')
  @ApiOperation({
    summary: 'Cancel/refund ticket',
    description: 'Cancels ticket and processes refund if eligible',
  })
  @ApiParam({ name: 'ticketId', description: 'Ticket ID to cancel' })
  @ApiOkResponse({
    description: 'Ticket cancellation processed',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        refundAmount: { type: 'number' },
        refundStatus: { type: 'string' },
        cancellationFee: { type: 'number' },
      },
    },
  })
  @HttpCode(HttpStatus.OK)
  async cancelTicket(
    @Param('ticketId') ticketId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<{
    success: boolean;
    refundAmount: number;
    refundStatus: string;
    cancellationFee: number;
  }> {
    const userId = this.getUserId(req);
    return this.ticketVerificationService.cancelTicket(ticketId, userId);
  }

  @Get('export/data')
  @ApiOperation({
    summary: 'Export dashboard data',
    description:
      'Exports comprehensive dashboard data in various formats (CSV, Excel, JSON)',
  })
  @ApiQuery({
    name: 'format',
    enum: ['csv', 'excel', 'json'],
    required: false,
    description: 'Export format',
  })
  @ApiQuery({
    name: 'type',
    enum: ['tickets', 'events', 'analytics'],
    required: false,
    description: 'Data type to export',
  })
  @ApiResponse({
    status: 200,
    description: 'Data exported successfully',
    content: {
      'application/json': { schema: { type: 'object' } },
      'text/csv': { schema: { type: 'string' } },
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
        schema: { type: 'string', format: 'binary' },
      },
    },
  })
  async exportData(
    @Req() req: AuthenticatedRequest,
    @Query('format') format: 'csv' | 'excel' | 'json' = 'json',
    @Query('type') type: 'tickets' | 'events' | 'analytics' = 'analytics',
    @Query() filters: DashboardFiltersDto,
  ): Promise<any> {
    const userId = this.getUserId(req);
    return this.dashboardService.exportUserData(userId, type, format, filters);
  }

  @Get('health')
  @ApiOperation({
    summary: 'Dashboard service health check',
    description:
      'Returns health status of dashboard service and related dependencies',
  })
  @ApiOkResponse({
    description: 'Service health status',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
        uptime: { type: 'number' },
        cacheStatus: { type: 'string' },
        dbConnection: { type: 'string' },
        lastCheck: { type: 'string', format: 'date-time' },
      },
    },
  })
  async getHealthStatus(): Promise<{
    status: string;
    uptime: number;
    cacheStatus: string;
    dbConnection: string;
    lastCheck: Date;
  }> {
    return this.dashboardService.getHealthStatus();
  }
}
