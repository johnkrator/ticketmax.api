import { Controller, Get, Post, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PaymentCleanupService } from './services/payment-cleanup.service';
import { EventManagementService } from './services/event-management.service';
import { BookingCleanupService } from './services/booking-cleanup.service';
import { NotificationSchedulerService } from './services/notification-scheduler.service';
import { DataCleanupService } from './services/data-cleanup.service';
import { AnalyticsService } from './services/analytics.service';

@ApiTags('Background Jobs')
@Controller('background-jobs')
export class BackgroundJobsController {
  private readonly logger = new Logger(BackgroundJobsController.name);

  constructor(
    private readonly paymentCleanupService: PaymentCleanupService,
    private readonly eventManagementService: EventManagementService,
    private readonly bookingCleanupService: BookingCleanupService,
    private readonly notificationSchedulerService: NotificationSchedulerService,
    private readonly dataCleanupService: DataCleanupService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Get background jobs status' })
  @ApiResponse({ status: 200, description: 'Background jobs status retrieved' })
  getStatus() {
    return {
      status: 'active',
      services: [
        'PaymentCleanupService',
        'EventManagementService',
        'BookingCleanupService',
        'NotificationSchedulerService',
        'DataCleanupService',
        'AnalyticsService',
      ],
      timestamp: new Date().toISOString(),
    };
  }

  @Post('payment-cleanup/run')
  @ApiOperation({ summary: 'Manually trigger payment cleanup' })
  @ApiResponse({ status: 200, description: 'Payment cleanup triggered' })
  async triggerPaymentCleanup() {
    this.logger.log('Manually triggering payment cleanup');
    await this.paymentCleanupService.cleanupAbandonedPayments();
    return { message: 'Payment cleanup completed' };
  }

  @Post('booking-cleanup/run')
  @ApiOperation({ summary: 'Manually trigger booking cleanup' })
  @ApiResponse({ status: 200, description: 'Booking cleanup triggered' })
  async triggerBookingCleanup() {
    this.logger.log('Manually triggering booking cleanup');
    await this.bookingCleanupService.cancelExpiredBookings();
    return { message: 'Booking cleanup completed' };
  }

  @Post('event-management/archive')
  @ApiOperation({ summary: 'Manually trigger event archival' })
  @ApiResponse({ status: 200, description: 'Event archival triggered' })
  async triggerEventArchival() {
    this.logger.log('Manually triggering event archival');
    await this.eventManagementService.archivePastEvents();
    return { message: 'Event archival completed' };
  }

  @Post('analytics/daily-report')
  @ApiOperation({ summary: 'Manually generate daily analytics report' })
  @ApiResponse({ status: 200, description: 'Daily analytics report generated' })
  async triggerDailyAnalytics() {
    this.logger.log('Manually triggering daily analytics');
    await this.analyticsService.generateDailyAnalytics();
    return { message: 'Daily analytics report generated' };
  }

  @Post('data-cleanup/temp-files')
  @ApiOperation({ summary: 'Manually trigger temporary files cleanup' })
  @ApiResponse({
    status: 200,
    description: 'Temporary files cleanup triggered',
  })
  async triggerTempFilesCleanup() {
    this.logger.log('Manually triggering temp files cleanup');
    await this.dataCleanupService.cleanTemporaryFiles();
    return { message: 'Temporary files cleanup completed' };
  }

  @Post('notifications/weekly-newsletter')
  @ApiOperation({ summary: 'Manually trigger weekly newsletter' })
  @ApiResponse({ status: 200, description: 'Weekly newsletter triggered' })
  async triggerWeeklyNewsletter() {
    this.logger.log('Manually triggering weekly newsletter');
    await this.notificationSchedulerService.sendWeeklyNewsletter();
    return { message: 'Weekly newsletter sent' };
  }
}
