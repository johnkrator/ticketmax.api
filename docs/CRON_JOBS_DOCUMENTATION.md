# TicketMax Cron Jobs Documentation

## Overview

TicketMax implements a comprehensive automated background processing system using NestJS Schedule module. This system
handles critical business operations through 6 specialized services that run scheduled tasks (cron jobs) to maintain
data integrity, process business logic, and enhance user experience.

## Table of Contents

- [Services Overview](#services-overview)
- [Installation & Setup](#installation--setup)
- [Service Details](#service-details)
- [Scheduling Reference](#scheduling-reference)
- [Configuration](#configuration)
- [Monitoring & Debugging](#monitoring--debugging)
- [Production Considerations](#production-considerations)
- [Manual Triggers](#manual-triggers)

## Services Overview

| Service                          | Purpose                      | Key Operations                           | Frequency         |
|----------------------------------|------------------------------|------------------------------------------|-------------------|
| **PaymentCleanupService**        | Payment processing & cleanup | Abandoned payments, timeouts, analytics  | 5-10 mins         |
| **BookingCleanupService**        | Booking lifecycle management | Expired bookings, refunds, confirmations | 5 mins - 2 hrs    |
| **EventManagementService**       | Event lifecycle operations   | Archival, reminders, status updates      | Hourly - Weekly   |
| **NotificationSchedulerService** | Customer engagement          | Newsletters, promotions, follow-ups      | Daily - Weekly    |
| **DataCleanupService**           | System maintenance           | Cache, files, logs, health monitoring    | Hourly - Weekly   |
| **AnalyticsService**             | Business intelligence        | Reports, metrics, performance monitoring | 30 mins - Monthly |

## Installation & Setup

### Dependencies

```json
{
  "@nestjs/schedule": "^4.1.0",
  "@nestjs/common": "^11.1.3",
  "@nestjs/core": "^11.1.3"
}
```

### Module Registration

The background services are automatically registered in the main application:

```typescript
// app.module.ts
import { BackgroundServicesModule } from './modules/background-services/background-services.module';

@Module({
  imports: [
    // ...other modules
    BackgroundServicesModule,
  ],
})
export class AppModule {}
```

### Environment Configuration

Create an `.npmrc` file in your project root:

```
legacy-peer-deps=true
```

This resolves peer dependency conflicts between NestJS 11 and the schedule module.

## Service Details

### 1. PaymentCleanupService

**Purpose**: Handles payment processing, cleanup, and analytics

#### Scheduled Tasks

| Task                         | Schedule         | Description                          |
|------------------------------|------------------|--------------------------------------|
| `cleanupAbandonedPayments()` | Every 10 minutes | Cancels payments pending >15 minutes |
| `handlePaymentTimeouts()`    | Every 5 minutes  | Processes payment gateway timeouts   |
| `cleanupOldFailedPayments()` | Sunday 1 AM      | Removes failed payments >30 days     |
| `generatePaymentAnalytics()` | Daily midnight   | Daily payment statistics             |

#### Key Features

- Automatic ticket release on payment failure
- User notification for failed payments
- Payment success rate tracking
- Revenue analytics

### 2. BookingCleanupService

**Purpose**: Manages booking lifecycle, refunds, and confirmations

#### Scheduled Tasks

| Task                                | Schedule         | Description                           |
|-------------------------------------|------------------|---------------------------------------|
| `cancelExpiredBookings()`           | Every 5 minutes  | Cancels bookings pending >10 minutes  |
| `processRefundRequests()`           | Every 2 hours    | Processes refund requests with policy |
| `sendPendingBookingConfirmations()` | Every 10 minutes | Sends confirmation emails             |
| `cleanupOldCancelledBookings()`     | Daily 2 AM       | Removes cancelled bookings >30 days   |
| `generateDailyReport()`             | Daily 11 PM      | Daily booking analytics               |

#### Refund Policy

- **>24 hours before event**: 100% refund
- **<24 hours before event**: 50% refund
- **After event**: No refund

### 3. EventManagementService

**Purpose**: Manages event lifecycle and customer communications

#### Scheduled Tasks

| Task                       | Schedule    | Description                           |
|----------------------------|-------------|---------------------------------------|
| `archivePastEvents()`      | Daily 2 AM  | Archives events >7 days old           |
| `sendEventReminders()`     | Daily 9 AM  | 24-hour event reminders               |
| `sendEarlyBirdReminders()` | Daily 10 AM | 7-day event reminders                 |
| `updateEventStatuses()`    | Every hour  | Updates event status (live/completed) |
| `generateEventAnalytics()` | Monday 8 AM | Weekly event performance              |

#### Event Status Flow

1. **Upcoming** → **Live** (on event date)
2. **Live** → **Completed** (4 hours after start)
3. **Completed** → **Archived** (7 days later)

### 4. NotificationSchedulerService

**Purpose**: Customer engagement and lifecycle marketing

#### Scheduled Tasks

| Task                             | Schedule              | Description                       |
|----------------------------------|-----------------------|-----------------------------------|
| `sendWeeklyNewsletter()`         | Monday 10 AM          | Newsletter to active users        |
| `sendPromotionalNotifications()` | Daily 2 PM            | Promotions for low-booking events |
| `sendBirthdayWishes()`           | Daily 9 AM            | Birthday offers                   |
| `sendEventFollowUps()`           | Daily noon            | Post-event feedback requests      |
| `sendReEngagementEmails()`       | Tuesday 3 PM          | Win-back campaigns                |
| `sendOrganizerAnalytics()`       | 1st day of month 8 AM | Monthly organizer reports         |

#### Customer Segmentation

- **Active Users**: Users with bookings in last 30 days
- **Inactive Users**: No bookings in 90+ days
- **Birthday Users**: Users with birthday today
- **Event Attendees**: Users who attended yesterday's events

### 5. DataCleanupService

**Purpose**: System maintenance and optimization

#### Scheduled Tasks

| Task                           | Schedule      | Description                     |
|--------------------------------|---------------|---------------------------------|
| `cleanCache()`                 | Every 4 hours | Cache cleanup and optimization  |
| `cleanTemporaryFiles()`        | Daily 3 AM    | Removes temp files >1 day       |
| `cleanOrphanedDocuments()`     | Sunday 4 AM   | Removes orphaned files >30 days |
| `generateSystemHealthReport()` | Daily 6 AM    | System health monitoring        |
| `cleanOldLogs()`               | Monday 2 AM   | Removes log files >30 days      |
| `emergencyDiskSpaceCheck()`    | Every hour    | Disk space monitoring           |

#### Health Monitoring

- Memory usage tracking
- Uptime monitoring
- Performance metrics
- Alert thresholds (>512MB heap usage)

### 6. AnalyticsService

**Purpose**: Business intelligence and reporting

#### Scheduled Tasks

| Task                                | Schedule              | Description                   |
|-------------------------------------|-----------------------|-------------------------------|
| `generateDailyAnalytics()`          | Daily 11 PM           | Comprehensive daily metrics   |
| `generateWeeklyBusinessReport()`    | Monday 9 AM           | Weekly business performance   |
| `generateMonthlyExecutiveSummary()` | 1st day of month 8 AM | Executive dashboard           |
| `monitorRealTimePerformance()`      | Every 30 minutes      | Real-time activity monitoring |

#### Key Metrics

- User acquisition and growth
- Revenue trends and conversion rates
- Event performance and booking rates
- Customer behavior analytics
- Month-over-month growth comparisons

## Scheduling Reference

### Cron Expression Format

```
* * * * * *
│ │ │ │ │ │
│ │ │ │ │ └── day of week (0 - 7) (Sunday = 0 or 7)
│ │ │ │ └──── month (1 - 12)
│ │ │ └────── day of month (1 - 31)
│ │ └──────── hour (0 - 23)
│ └────────── minute (0 - 59)
└──────────── second (0 - 59)
```

### Common Patterns Used

```typescript
// Predefined expressions
CronExpression.EVERY_5_MINUTES    // */5 * * * *
CronExpression.EVERY_10_MINUTES   // */10 * * * *
CronExpression.EVERY_HOUR         // 0 * * * *
CronExpression.EVERY_2_HOURS      // 0 */2 * * *

// Custom expressions
'0 9 * * *'     // Daily at 9 AM
'0 2 * * *'     // Daily at 2 AM
'0 8 * * 1'     // Monday at 8 AM
'0 8 1 * *'     // First day of month at 8 AM
'0 4 * * 0'     // Sunday at 4 AM
```

## Configuration

### Email Configuration

Ensure these environment variables are set:

```env
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_USER=your-email
SMTP_PASS=your-password
SMTP_FROM=noreply@ticketmax.com
FRONTEND_URL=https://your-frontend-url.com
```

### Database Requirements

Required fields for cron job functionality:

#### Booking Entity

```typescript
// Tracking fields
reminderSent?: boolean;
reminderSentAt?: Date;
earlyReminderSent?: boolean;
confirmationEmailSent?: boolean;
followUpSent?: boolean;

// Refund fields
refundRequested?: boolean;
refundProcessed?: boolean;
refundAmount?: number;
refundDenied?: boolean;
```

#### User Entity

```typescript
// Marketing preferences
newsletterSubscribed?: boolean;
promotionalEmails?: boolean;
reengagementSent?: boolean;

// Activity tracking
lastLoginAt?: Date;
lastActivityAt?: Date;
```

#### Event Entity

```typescript
// Status tracking
status?: string;
archived?: boolean;
archivedAt?: Date;
```

## Monitoring & Debugging

### Logging

All services use NestJS Logger with structured logging:

```typescript
this.logger.log('Operation completed successfully');
this.logger.warn('High activity detected');
this.logger.error('Operation failed:', error);
```

### Log Output Examples

```
[BackgroundServices] PaymentCleanupService - Processed 5 abandoned payments
[BackgroundServices] BookingCleanupService - Cancelled 3 expired bookings
[BackgroundServices] AnalyticsService - Daily Report - Revenue: $2,450
```

### Health Checks

Monitor application health through:

- Memory usage alerts (>512MB)
- Real-time performance metrics
- Database operation success rates
- Email delivery status

### Error Handling

All cron jobs include comprehensive error handling:

```typescript
try {
  // Operation logic
} catch (error) {
  this.logger.error('Error in operation:', error);
  // Continue with other operations
}
```

## Production Considerations

### Scaling

- **Single Instance**: All cron jobs run on one instance
- **Multi-Instance**: Use distributed locking for critical operations
- **Database Load**: Monitor peak times and optimize queries

### Performance Optimization

```typescript
// Use pagination for large datasets
const users = await this.userModel.find(query).limit(100);

// Use aggregation for complex queries
const stats = await this.bookingModel.aggregate([...]);

// Batch operations where possible
await Promise.all(operations);
```

### Deployment

- Ensure `.npmrc` file is included in deployment
- Set appropriate environment variables
- Monitor initial deployment for cron job execution
- Verify email service configuration

### Resource Management

- Memory: Monitor heap usage in daily reports
- CPU: Optimize database queries and batch operations
- Storage: Regular cleanup of temporary files and logs
- Network: Rate limit external API calls

## Manual Triggers

### REST API Endpoints

For testing and emergency operations:

```http
GET  /background-jobs/status
POST /background-jobs/payment-cleanup/run
POST /background-jobs/booking-cleanup/run
POST /background-jobs/event-management/archive
POST /background-jobs/analytics/daily-report
POST /background-jobs/data-cleanup/temp-files
POST /background-jobs/notifications/weekly-newsletter
```

### Usage Examples

```bash
# Check status
curl https://api.ticketmax.com/background-jobs/status

# Trigger payment cleanup
curl -X POST https://api.ticketmax.com/background-jobs/payment-cleanup/run

# Generate daily report
curl -X POST https://api.ticketmax.com/background-jobs/analytics/daily-report
```

### Emergency Procedures

1. **High Memory Usage**:
   ```bash
   POST /background-jobs/data-cleanup/temp-files
   ```

2. **Payment Issues**:
   ```bash
   POST /background-jobs/payment-cleanup/run
   ```

3. **Booking Problems**:
   ```bash
   POST /background-jobs/booking-cleanup/run
   ```

## Troubleshooting

### Common Issues

1. **Dependency Conflicts**:
    - Ensure `.npmrc` with `legacy-peer-deps=true`
    - Verify NestJS versions compatibility

2. **Email Not Sending**:
    - Check SMTP configuration
    - Verify environment variables
    - Test email service connectivity

3. **Database Connection Issues**:
    - Monitor connection pool
    - Check MongoDB health
    - Verify database permissions

4. **Performance Issues**:
    - Monitor memory usage
    - Optimize database queries
    - Review cron job frequency

### Debug Mode

Enable detailed logging:

```typescript
this.logger.setContext('CronJobDebug');
this.logger.debug(`Processing ${items.length} items`);
```

## Best Practices

1. **Error Handling**: Always wrap operations in try-catch
2. **Logging**: Use structured logging with context
3. **Performance**: Batch operations and use pagination
4. **Monitoring**: Set up alerts for critical failures
5. **Testing**: Use manual triggers for testing
6. **Documentation**: Keep this document updated with changes

---

**Last Updated**: July 27, 2025  
**Version**: 1.0.0  
**Maintainer**: TicketMax Development Team
