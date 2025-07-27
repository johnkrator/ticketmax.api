# Background Services Documentation

## Overview

The TicketMax API includes a comprehensive background services system that handles automated tasks such as booking
cleanup, event management, notifications, analytics, and data maintenance. All services run internally using cron jobs
without requiring any external API endpoints.

## Environment Configuration

Configure the background services using these environment variables in your `.env` file:

```env
# Background Services Configuration
SCHEDULER_ENABLED=true
SCHEDULER_TIMEZONE=UTC
NODE_ENV=production

# Service-specific Configuration
BOOKING_TIMEOUT_MINUTES=10
```

## Available Services

### 1. Notification Scheduler Service

Handles all automated notifications and communications.

**Cron Jobs:**

- **Every Hour**: Check for upcoming event notifications (24-hour and 1-hour reminders)
- **Monday 10 AM**: Send weekly newsletter to active users
- **Every 30 minutes**: Process pending payment reminders
- **Daily 2 AM**: Clean up old notifications

**Example Logs:**

```
[Nest] 7350  - 07/27/2025, 10:01:00 AM   DEBUG [NotificationSchedulerService] 🔍 Checking for upcoming event notifications...
[Nest] 7350  - 07/27/2025, 10:01:15 AM   LOG   [NotificationSchedulerService] ✅ Sent 24-hour reminders for event "Summer Music Festival" to 150 attendees
```

### 2. Booking Cleanup Service

Manages booking lifecycle and cleanup operations.

**Cron Jobs:**

- **Every 2 minutes**: Cancel expired bookings (configurable timeout)
- **Daily 3 AM**: Archive old completed bookings (6+ months)
- **Daily 9 AM**: Process booking completions for past events
- **Sunday 11 PM**: Generate weekly booking reports

**Example Logs:**

```
[Nest] 7350  - 07/27/2025, 10:02:00 AM   DEBUG [BookingCleanupService] 🔍 Checking for expired bookings...
[Nest] 7350  - 07/27/2025, 10:02:05 AM   LOG   [BookingCleanupService] ✅ Cancelled 5 expired bookings, released 12 tickets
```

### 3. Event Management Service

Monitors and manages event statuses and lifecycle.

**Cron Jobs:**

- **Every 15 minutes**: Update event statuses (upcoming → ongoing → completed)
- **Daily 4 AM**: Archive old events (1+ year old)
- **Every Hour**: Check event capacity alerts (80% and 95% thresholds)
- **Daily Midnight**: Generate daily event metrics

**Example Logs:**

```
[Nest] 7350  - 07/27/2025, 10:03:00 AM   DEBUG [EventManagementService] 🔍 Checking event statuses...
[Nest] 7350  - 07/27/2025, 10:03:10 AM   LOG   [EventManagementService] ✅ Updated status for 3 events
[Nest] 7350  - 07/27/2025, 10:03:15 AM   LOG   [EventManagementService] 🚨 Sent 80% capacity alert for event "Tech Conference 2025" (85% full)
```

### 4. Payment Cleanup Service

Handles payment-related cleanup and analytics.

**Cron Jobs:**

- **Every Hour**: Clean up failed payment records
- **Daily 1 AM**: Generate payment analytics and success rates

**Example Logs:**

```
[Nest] 7350  - 07/27/2025, 10:04:00 AM   DEBUG [PaymentCleanupService] 💳 Cleaning up failed payment records...
[Nest] 7350  - 07/27/2025, 01:00:00 AM   LOG   [PaymentCleanupService] 💰 Payment Analytics for Sat Jul 26 2025:
[Nest] 7350  - 07/27/2025, 01:00:01 AM   LOG   [PaymentCleanupService]    CONFIRMED: 45 transactions, $2,340.50 total, $52.01 avg
[Nest] 7350  - 07/27/2025, 01:00:02 AM   LOG   [PaymentCleanupService]    Success Rate: 89.52% (45/50)
```

### 5. Data Cleanup Service

Maintains data integrity and performs database maintenance.

**Cron Jobs:**

- **Sunday 3 AM**: Clean up inactive users (6+ months)
- **Daily 5 AM**: Clean up temporary files and uploads
- **Every Hour**: Remove expired session data
- **Saturday 2 AM**: Optimize database indexes
- **Monday 6 AM**: Generate data health reports

**Example Logs:**

```
[Nest] 7350  - 07/27/2025, 10:05:00 AM   DEBUG [DataCleanupService] 👥 Cleaning up inactive users...
[Nest] 7350  - 07/27/2025, 06:00:00 AM   LOG   [DataCleanupService] 📊 Weekly Data Health Report:
[Nest] 7350  - 07/27/2025, 06:00:01 AM   LOG   [DataCleanupService]    Users: 1,234/1,250 active
[Nest] 7350  - 07/27/2025, 06:00:02 AM   LOG   [DataCleanupService]    Events: 25/145 upcoming
```

### 6. Analytics Service

Generates comprehensive analytics and business insights.

**Cron Jobs:**

- **Every Hour**: Generate hourly analytics
- **Daily Midnight**: Generate daily comprehensive analytics
- **Monday 7 AM**: Generate weekly performance reports
- **1st of month 8 AM**: Generate monthly business insights

**Example Logs:**

```
[Nest] 7350  - 07/27/2025, 10:06:00 AM   DEBUG [AnalyticsService] 📊 Generating hourly analytics...
[Nest] 7350  - 07/27/2025, 10:06:05 AM   LOG   [AnalyticsService] 📈 Hourly Stats: 3 new users, 8 bookings, $420.00 revenue
[Nest] 7350  - 07/27/2025, 07:00:00 AM   LOG   [AnalyticsService] 📊 Weekly Performance Report:
[Nest] 7350  - 07/27/2025, 07:00:01 AM   LOG   [AnalyticsService]    New Users: 89
[Nest] 7350  - 07/27/2025, 07:00:02 AM   LOG   [AnalyticsService]    Total Revenue: $15,670.25
```

## Service Status Monitoring

### Checking Service Status

All background services log their initialization status when the application starts:

```
[Nest] 7350  - 07/27/2025, 09:00:00 AM   LOG   [NotificationSchedulerService] ✅ Notification Scheduler Service initialized - Timezone: UTC
[Nest] 7350  - 07/27/2025, 09:00:01 AM   LOG   [BookingCleanupService] ✅ Booking Cleanup Service initialized - Timeout: 10 minutes
[Nest] 7350  - 07/27/2025, 09:00:02 AM   LOG   [EventManagementService] ✅ Event Management Service initialized
[Nest] 7350  - 07/27/2025, 09:00:03 AM   LOG   [PaymentCleanupService] ✅ Payment Cleanup Service initialized
[Nest] 7350  - 07/27/2025, 09:00:04 AM   LOG   [DataCleanupService] ✅ Data Cleanup Service initialized
[Nest] 7350  - 07/27/2025, 09:00:05 AM   LOG   [AnalyticsService] ✅ Analytics Service initialized
```

### Disabling Services

To disable all background services, set `SCHEDULER_ENABLED=false` in your environment:

```
[Nest] 7350  - 07/27/2025, 09:00:00 AM   LOG   [NotificationSchedulerService] ⏸️ Notification Scheduler Service disabled via SCHEDULER_ENABLED=false
```

## Implementation Details

### Architecture

- **No Controllers**: Background services run internally without exposing any HTTP endpoints
- **Environment Driven**: All services check `SCHEDULER_ENABLED` before executing
- **Comprehensive Logging**: Each service provides detailed logging with emojis for easy identification
- **Error Handling**: All cron jobs include proper error handling and logging
- **Database Integration**: Services use MongoDB models directly for data operations

### Cron Schedule Format

The services use standard cron expressions:

- `*/2 * * * *` - Every 2 minutes
- `0 1 * * *` - Daily at 1 AM
- `0 7 * * 1` - Every Monday at 7 AM
- `0 8 1 * *` - 1st of every month at 8 AM

### Log Levels

- **DEBUG**: Routine task start notifications
- **LOG**: Successful operations and metrics
- **WARN**: Non-critical issues or alerts
- **ERROR**: Failed operations that need attention

## Troubleshooting

### Common Issues

1. **Services Not Running**
    - Check `SCHEDULER_ENABLED=true` in environment
    - Verify application startup logs for service initialization

2. **Missing Logs**
    - Ensure log level is set to include DEBUG messages
    - Check if services are disabled via environment variables

3. **Database Connection Issues**
    - Verify MongoDB connection is established before services start
    - Check database connectivity in application logs

### Monitoring

Monitor the terminal output for regular service activity:

- Services should log activity according to their schedules
- Look for error messages that indicate issues
- Monitor resource usage during heavy operations (analytics, cleanup)

## Email Service Integration

Many background services depend on the `EmailSendService` for notifications. Ensure your email configuration is properly
set up for:

- Booking cancellation notifications
- Event reminders
- Payment failure alerts
- Weekly newsletters
- Capacity alerts

## Performance Considerations

- **Database Indexes**: Ensure proper indexes on date fields (createdAt, updatedAt, startDateTime)
- **Batch Processing**: Large cleanup operations are batched to prevent performance issues
- **Error Recovery**: Services continue operating even if individual tasks fail
- **Resource Management**: Heavy operations are scheduled during low-traffic periods

## Future Enhancements

The background services system is designed to be extensible. You can:

- Add new services by creating additional service classes
- Modify cron schedules based on business requirements
- Add custom analytics and reporting
- Integrate with external monitoring systems
- Add webhook notifications for critical events
