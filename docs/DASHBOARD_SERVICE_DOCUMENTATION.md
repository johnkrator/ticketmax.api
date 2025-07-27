# Dashboard Service Documentation

## Overview

The Dashboard Service is a comprehensive analytics and statistics service that provides real-time insights into event
management, ticket sales, revenue tracking, and customer behavior analysis for the TicketMax platform.

## Features

### Core Functionality

- **Real-time Dashboard Statistics** with intelligent caching (5-minute TTL)
- **User Ticket Management** with pagination and filtering
- **Event Analytics** with performance metrics
- **Revenue Analytics** with forecasting and trends
- **Customer Insights** and behavior analysis
- **Sales Timeline** for trend analysis
- **Server-Sent Events** for real-time updates
- **Data Export** in multiple formats (JSON, CSV, Excel)

### Performance Optimizations

- **Intelligent Caching System** with configurable TTL
- **Parallel Query Execution** for optimal database performance
- **Aggregation Pipelines** for complex analytics calculations
- **Memory-efficient** pagination for large datasets

## API Endpoints

### Dashboard Statistics

#### `GET /dashboard/stats`

Returns comprehensive dashboard KPIs including tickets, events, revenue, and growth metrics.

**Query Parameters:**

- `startDate` (optional): Filter start date (ISO format)
- `endDate` (optional): Filter end date (ISO format)
- `period` (optional): Time period filter (week, month, quarter, year)

**Response:**

```typescript
{
  myTickets: number;
  myEvents: number;
  ticketsSold: number;
  revenue: number;
  upcomingEvents: number;
  recentBookings: number;
  averageOrderValue: number;
  totalOrders: number;
  uniqueCustomers: number;
  maxOrderValue: number;
  minOrderValue: number;
  monthlyRevenue: number;
  conversionRate: number;
  repeatCustomerRate: number;
  growthRate: number;
  lastUpdated: Date;
}
```

### User Tickets

#### `GET /dashboard/tickets`

Returns paginated list of user tickets with detailed event information and QR codes.

**Query Parameters:**

- `page` (optional, default: 1): Page number
- `limit` (optional, default: 10): Items per page
- `status` (optional): Filter by booking status
- `eventId` (optional): Filter by specific event

**Response:**

```typescript
{
  tickets: UserTicketDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  }
  ;
}
```

### User Events

#### `GET /dashboard/events`

Returns paginated list of user events with comprehensive performance metrics.

**Query Parameters:**

- `page` (optional, default: 1): Page number
- `limit` (optional, default: 10): Items per page
- `startDate` (optional): Filter start date
- `endDate` (optional): Filter end date
- `period` (optional): Time period filter
- `category` (optional): Event category filter

### Analytics Endpoints

#### `GET /dashboard/analytics/revenue`

Returns detailed revenue analysis including trends, forecasts, and category breakdowns.

#### `GET /dashboard/analytics/events`

Returns performance metrics for events including conversion rates and sales velocity.

#### `GET /dashboard/analytics/customers`

Returns customer insights including demographics and behavior patterns.

#### `GET /dashboard/analytics/timeline`

Returns daily sales data for trend analysis and forecasting.

#### `GET /dashboard/analytics/categories`

Returns top performing categories with revenue and market share analysis.

### Real-time Updates

#### `GET /dashboard/updates` (Server-Sent Events)

Establishes a real-time stream for dashboard statistics updates.

### Ticket Operations

#### `GET /dashboard/tickets/:ticketId/verify`

Verifies ticket authenticity using QR code data.

#### `POST /dashboard/tickets/:ticketId/checkin`

Marks ticket as checked in for event attendance tracking.

#### `GET /dashboard/tickets/:ticketId/download`

Generates and returns downloadable PDF ticket with QR code.

#### `DELETE /dashboard/tickets/:ticketId/cancel`

Cancels ticket and processes refund if eligible.

### Data Export

#### `GET /dashboard/export/data`

Exports dashboard data in various formats.

**Query Parameters:**

- `format` (optional, default: json): Export format (csv, excel, json)
- `type` (optional, default: analytics): Data type (tickets, events, analytics)

### Health Check

#### `GET /dashboard/health`

Returns health status of dashboard service and dependencies.

## Data Transfer Objects (DTOs)

### DashboardStatsDto

Comprehensive dashboard statistics including revenue, tickets, events, and growth metrics.

### UserTicketDto

Detailed ticket information including:

- Event details (title, date, time, location)
- Ticket information (type, quantity, status)
- Customer information
- QR code data for verification
- Refund eligibility status
- Download URL for PDF ticket

### UserEventDto

Event information with analytics:

- Basic event details
- Sales performance metrics
- Revenue data
- Attendance statistics
- Event status and progress

### RevenueAnalyticsDto

Revenue analysis including:

- Total revenue and growth percentage
- Revenue by category breakdown
- Monthly revenue trends
- Forecasting data
- Average revenue per ticket

### EventPerformanceDto

Event performance metrics:

- Performance score (0-100)
- Sales velocity
- Conversion rates
- Revenue per visitor
- Attendance and refund rates

### CustomerInsightsDto

Customer behavior analysis:

- Customer demographics
- Retention and lifetime value metrics
- Behavior patterns
- Segmentation data

## Entity Mapping

### Booking to UserTicket Mapping

The service includes comprehensive mapping from MongoDB booking documents to structured UserTicketDto objects:

```typescript
private
mapBookingToUserTicket(ticket
:
any
):
UserTicketDto
{
  // Maps booking data including:
  // - Event information via population
  // - Organizer details
  // - QR code generation
  // - Refund eligibility calculation
  // - Download URL generation
}
```

### Event to UserEvent Mapping

Events are enhanced with real-time analytics:

```typescript
private async
mapEventToUserEvent(event
:
any
):
Promise < UserEventDto > {
  // Enhances event data with:
  // - Real-time booking statistics
  // - Revenue calculations
  // - Sales progress tracking
  // - Event status determination
}
```

## Caching Strategy

### Stats Cache

- **TTL**: 5 minutes
- **Key Pattern**: `${userId}_${JSON.stringify(filters)}`
- **Refresh Strategy**: Background refresh for active users

### Analytics Cache

- **TTL**: 15 minutes
- **Key Pattern**: `${analytics_type}_${userId}_${period}`
- **Use Case**: Complex analytics calculations

## Database Aggregations

The service uses MongoDB aggregation pipelines for complex analytics:

### Revenue Analytics Pipeline

```typescript
await this.bookingModel.aggregate([
  {
    $lookup: {
      from: 'events',
      localField: 'eventId',
      foreignField: '_id',
      as: 'event',
    },
  },
  {
    $match: {
      'event.organizerId': userId,
      status: BookingStatus.CONFIRMED,
      ...dateFilter,
    },
  },
  {
    $group: {
      _id: null,
      totalRevenue: { $sum: '$totalAmount' },
      totalTickets: { $sum: '$quantity' },
      // ... additional aggregations
    },
  },
]);
```

### Customer Insights Pipeline

Complex customer behavior analysis using multi-stage aggregations for:

- Customer segmentation
- Retention rate calculation
- Lifetime value analysis
- Purchase pattern identification

## Error Handling

### Comprehensive Error Management

- **Service-level** error catching with detailed logging
- **Controller-level** error transformation
- **HTTP status codes** for different error types
- **User-friendly error messages**

### Logging Strategy

```typescript
private readonly
logger = new Logger(DashboardService.name);

// Error logging with context
this.logger.error(`Error calculating dashboard stats for user ${userId}:`, error);

// Debug logging for performance monitoring
this.logger.debug(`Returning cached stats for user ${userId}`);
```

## Security Features

### Authentication & Authorization

- **JWT Authentication** required for all endpoints
- **User Context** validation for data access
- **Request Validation** using class-validator

### Data Privacy

- **User-scoped** data access (users only see their own data)
- **Sensitive data filtering** in responses
- **Secure hash generation** for ticket verification

## Performance Considerations

### Query Optimization

- **Parallel execution** of independent queries
- **Efficient aggregation pipelines**
- **Strategic indexing** for frequently accessed fields
- **Pagination** for large datasets

### Memory Management

- **Streaming responses** for large data exports
- **Garbage collection** friendly caching
- **Resource cleanup** on module destruction

## Integration Points

### External Services

- **Email Service**: For ticket delivery and notifications
- **SMS Service**: For real-time alerts
- **Payment Service**: For refund processing
- **Cloud Storage**: For ticket PDF storage

### Internal Dependencies

- **Event Service**: For event data retrieval
- **Booking Service**: For booking management
- **User Service**: For user information
- **Notification Service**: For real-time updates

## Testing Strategy

### Unit Tests

- Service method testing with mocked dependencies
- DTO validation testing
- Entity mapping validation
- Cache behavior testing

### Integration Tests

- End-to-end API testing
- Database aggregation testing
- Real-time update testing
- Error handling validation

### Performance Tests

- Load testing for high-concurrency scenarios
- Cache performance validation
- Database query optimization testing
- Memory usage monitoring

## Deployment Considerations

### Environment Variables

```env
API_URL=https://api.ticketmax.com
JWT_SECRET=your-jwt-secret
MONGODB_URI=mongodb://localhost:27017/ticketmax
CACHE_TTL=300000
ANALYTICS_CACHE_TTL=900000
```

### Monitoring

- **Health check endpoint** for service monitoring
- **Performance metrics** collection
- **Error rate monitoring**
- **Cache hit rate tracking**

## Future Enhancements

### Planned Features

1. **Machine Learning Integration** for predictive analytics
2. **Advanced Forecasting** using historical data
3. **Real-time Notifications** for threshold-based alerts
4. **Custom Dashboard** configuration
5. **Advanced Reporting** with scheduled exports
6. **Mobile Analytics** for mobile app usage

### Performance Improvements

1. **Redis Integration** for distributed caching
2. **Database Sharding** for horizontal scaling
3. **CDN Integration** for static assets
4. **GraphQL Support** for flexible data fetching

## Conclusion

The Dashboard Service provides a robust, scalable, and feature-rich analytics platform for the TicketMax application.
With comprehensive caching, real-time updates, detailed analytics, and proper entity mapping, it serves as the central
hub for business intelligence and user insights.

The service is designed with performance, security, and maintainability in mind, making it suitable for production
environments with high traffic and complex analytical requirements.
