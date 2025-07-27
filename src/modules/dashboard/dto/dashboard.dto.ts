import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsDateString,
  IsEnum,
  IsNumber,
  IsString,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';

export enum DashboardPeriod {
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
}

export class DashboardFiltersDto {
  @ApiProperty({ required: false, description: 'Start date for filtering' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ required: false, description: 'End date for filtering' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    enum: DashboardPeriod,
    required: false,
    description: 'Time period filter',
  })
  @IsOptional()
  @IsEnum(DashboardPeriod)
  period?: DashboardPeriod;

  @ApiProperty({ required: false, description: 'Event category filter' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ required: false, description: 'Event status filter' })
  @IsOptional()
  @IsString()
  status?: string;
}

export class DashboardStatsDto {
  @ApiProperty({ description: 'Number of user tickets' })
  myTickets: number;

  @ApiProperty({ description: 'Number of user events' })
  myEvents: number;

  @ApiProperty({ description: 'Total tickets sold' })
  ticketsSold: number;

  @ApiProperty({ description: 'Total revenue generated' })
  revenue: number;

  @ApiProperty({ description: 'Number of upcoming events' })
  upcomingEvents: number;

  @ApiProperty({ description: 'Recent bookings count (last 7 days)' })
  recentBookings: number;

  @ApiProperty({ description: 'Average order value' })
  averageOrderValue: number;

  @ApiProperty({ description: 'Total number of orders' })
  totalOrders: number;

  @ApiProperty({ description: 'Last updated timestamp' })
  lastUpdated: Date;

  @ApiProperty({ description: 'Number of unique customers' })
  uniqueCustomers: number;

  @ApiProperty({ description: 'Maximum order value' })
  maxOrderValue: number;

  @ApiProperty({ description: 'Minimum order value' })
  minOrderValue: number;

  @ApiProperty({ description: 'Revenue for current month' })
  monthlyRevenue: number;

  @ApiProperty({ description: 'Conversion rate percentage' })
  conversionRate: number;

  @ApiProperty({ description: 'Repeat customer rate percentage' })
  repeatCustomerRate: number;

  @ApiProperty({ description: 'Growth rate percentage' })
  growthRate: number;
}

export class UserTicketDto {
  @ApiProperty({ description: 'Ticket ID' })
  id: string;

  @ApiProperty({ description: 'Event title' })
  eventTitle: string;

  @ApiProperty({ description: 'Event date' })
  date: string;

  @ApiProperty({ description: 'Event time' })
  time: string;

  @ApiProperty({ description: 'Event location' })
  location: string;

  @ApiProperty({ description: 'Event category' })
  category: string;

  @ApiProperty({ description: 'Event description' })
  description: string;

  @ApiProperty({ description: 'Ticket type' })
  ticketType: string;

  @ApiProperty({ description: 'Number of tickets' })
  quantity: number;

  @ApiProperty({ description: 'Ticket status' })
  status: string;

  @ApiProperty({ description: 'Unique ticket number' })
  ticketNumber: string;

  @ApiProperty({ description: 'Total amount paid' })
  totalAmount: number;

  @ApiProperty({ description: 'Event image URL', required: false })
  eventImage?: string;

  @ApiProperty({ description: 'Customer name' })
  customerName: string;

  @ApiProperty({ description: 'Customer email' })
  customerEmail: string;

  @ApiProperty({ description: 'Customer phone', required: false })
  customerPhone?: string;

  @ApiProperty({ description: 'Booking date' })
  bookingDate: Date;

  @ApiProperty({ description: 'Confirmation date', required: false })
  confirmedAt?: Date;

  @ApiProperty({ description: 'Event organizer name' })
  organizerName: string;

  @ApiProperty({ description: 'QR code data' })
  qrData: string;

  @ApiProperty({ description: 'Whether ticket is refund eligible' })
  refundEligible: boolean;

  @ApiProperty({ description: 'Download URL for ticket PDF' })
  downloadUrl: string;
}

export class UserEventDto {
  @ApiProperty({ description: 'Event ID' })
  id: string;

  @ApiProperty({ description: 'Event title' })
  title: string;

  @ApiProperty({ description: 'Event description' })
  description: string;

  @ApiProperty({ description: 'Event date' })
  date: string;

  @ApiProperty({ description: 'Event time' })
  time: string;

  @ApiProperty({ description: 'Event location' })
  location: string;

  @ApiProperty({ description: 'Event category' })
  category: string;

  @ApiProperty({ description: 'Number of tickets sold' })
  ticketsSold: number;

  @ApiProperty({ description: 'Total tickets available' })
  totalTickets: number;

  @ApiProperty({ description: 'Revenue generated' })
  revenue: number;

  @ApiProperty({ description: 'Total number of bookings' })
  totalBookings: number;

  @ApiProperty({ description: 'Number of unique attendees' })
  uniqueAttendees: number;

  @ApiProperty({ description: 'Recent bookings (last 7 days)' })
  recentBookings: number;

  @ApiProperty({ description: 'Average order value' })
  averageOrderValue: number;

  @ApiProperty({ description: 'Event status' })
  status: string;

  @ApiProperty({ description: 'Event image URL', required: false })
  image?: string;

  @ApiProperty({ description: 'Ticket price' })
  price: string;

  @ApiProperty({ description: 'Featured event flag' })
  featured: boolean;

  @ApiProperty({ description: 'Creation date' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  updatedAt: Date;

  @ApiProperty({ description: 'Sales progress percentage' })
  salesProgress: number;

  @ApiProperty({ description: 'Days until event (0 if past)' })
  daysUntilEvent: number;

  @ApiProperty({ description: 'Whether event is currently active' })
  isActive: boolean;

  @ApiProperty({ description: 'Whether event is in the past' })
  isPastEvent: boolean;

  @ApiProperty({ description: 'Whether event is sold out' })
  soldOut: boolean;
}

export class PaginationDto {
  @ApiProperty({ description: 'Current page number' })
  page: number;

  @ApiProperty({ description: 'Number of items per page' })
  limit: number;

  @ApiProperty({ description: 'Total number of items' })
  total: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;

  @ApiProperty({ description: 'Whether there is a next page' })
  hasNext: boolean;

  @ApiProperty({ description: 'Whether there is a previous page' })
  hasPrev: boolean;
}

export class AnalyticsDto {
  @ApiProperty({ description: 'Total revenue' })
  totalRevenue: number;

  @ApiProperty({ description: 'Total tickets sold' })
  totalTicketsSold: number;

  @ApiProperty({ description: 'Number of events' })
  eventCount: number;

  @ApiProperty({ description: 'Average revenue per event' })
  averageRevenuePerEvent: number;

  @ApiProperty({ description: 'Period for analytics' })
  period: string;

  @ApiProperty({ description: 'Analytics generation date' })
  generatedAt: Date;
}

export class RevenueAnalyticsDto {
  @ApiProperty({ description: 'Total revenue for period' })
  totalRevenue: number;

  @ApiProperty({ description: 'Revenue growth percentage' })
  growthPercentage: number;

  @ApiProperty({ description: 'Revenue by category breakdown' })
  revenueByCategory: {
    category: string;
    revenue: number;
    percentage: number;
  }[];

  @ApiProperty({ description: 'Monthly revenue trend' })
  monthlyTrend: { month: string; revenue: number }[];

  @ApiProperty({ description: 'Revenue forecast for next period' })
  forecast: number;

  @ApiProperty({ description: 'Peak revenue month' })
  peakMonth: string;

  @ApiProperty({ description: 'Average monthly revenue' })
  averageMonthlyRevenue: number;

  @ApiProperty({ description: 'Revenue per ticket average' })
  averageRevenuePerTicket: number;
}

export class EventPerformanceDto {
  @ApiProperty({ description: 'Event ID' })
  eventId: string;

  @ApiProperty({ description: 'Event title' })
  eventTitle: string;

  @ApiProperty({ description: 'Performance score (0-100)' })
  performanceScore: number;

  @ApiProperty({ description: 'Sales velocity (tickets per day)' })
  salesVelocity: number;

  @ApiProperty({ description: 'Conversion rate percentage' })
  conversionRate: number;

  @ApiProperty({ description: 'Revenue per visitor' })
  revenuePerVisitor: number;

  @ApiProperty({ description: 'Time to sell out (days)' })
  timeToSellOut?: number;

  @ApiProperty({ description: 'Attendance rate percentage' })
  attendanceRate: number;

  @ApiProperty({ description: 'Customer satisfaction score' })
  satisfactionScore?: number;

  @ApiProperty({ description: 'Refund rate percentage' })
  refundRate: number;

  @ApiProperty({ description: 'Marketing ROI' })
  marketingROI?: number;
}

export class CustomerInsightsDto {
  @ApiProperty({ description: 'Total unique customers' })
  totalCustomers: number;

  @ApiProperty({ description: 'New customers this period' })
  newCustomers: number;

  @ApiProperty({ description: 'Returning customers' })
  returningCustomers: number;

  @ApiProperty({ description: 'Customer retention rate' })
  retentionRate: number;

  @ApiProperty({ description: 'Average customer lifetime value' })
  averageLifetimeValue: number;

  @ApiProperty({ description: 'Average tickets per customer' })
  averageTicketsPerCustomer: number;

  @ApiProperty({ description: 'Top customer segments' })
  topSegments: { segment: string; count: number; revenue: number }[];

  @ApiProperty({ description: 'Customer demographics' })
  demographics: {
    ageGroups: { range: string; percentage: number }[];
    genderDistribution: { gender: string; percentage: number }[];
    locationDistribution: { city: string; percentage: number }[];
  };

  @ApiProperty({ description: 'Customer behavior patterns' })
  behaviorPatterns: {
    preferredEventTypes: string[];
    averageDaysBetweenPurchases: number;
    mostActiveDay: string;
    mostActiveHour: number;
  };
}

export class SalesTimelineDto {
  @ApiProperty({ description: 'Date of sales data' })
  date: string;

  @ApiProperty({ description: 'Revenue for the date' })
  revenue: number;

  @ApiProperty({ description: 'Tickets sold for the date' })
  ticketsSold: number;

  @ApiProperty({ description: 'Number of orders for the date' })
  orderCount: number;

  @ApiProperty({ description: 'Average order value for the date' })
  averageOrderValue: number;
}

export class TopCategoriesDto {
  @ApiProperty({ description: 'Category name' })
  category: string;

  @ApiProperty({ description: 'Total revenue from category' })
  revenue: number;

  @ApiProperty({ description: 'Total tickets sold in category' })
  ticketsSold: number;

  @ApiProperty({ description: 'Number of events in category' })
  eventCount: number;

  @ApiProperty({ description: 'Average order value for category' })
  averageOrderValue: number;

  @ApiProperty({ description: 'Market share percentage' })
  marketShare: number;
}

export class BookingTrendsDto {
  @ApiProperty({ description: 'Trend period identifier' })
  period: string;

  @ApiProperty({ description: 'Total bookings in period' })
  bookings: number;

  @ApiProperty({ description: 'Booking growth percentage' })
  growthPercentage: number;

  @ApiProperty({ description: 'Peak booking day' })
  peakDay: string;

  @ApiProperty({ description: 'Average bookings per day' })
  averageBookingsPerDay: number;

  @ApiProperty({ description: 'Cancellation rate' })
  cancellationRate: number;

  @ApiProperty({ description: 'Most popular booking time' })
  popularBookingTime: { hour: number; percentage: number };
}

// Query DTOs for API endpoints
export class GetTicketsQueryDto {
  @ApiProperty({ required: false, default: 1, description: 'Page number' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, default: 10, description: 'Items per page' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  limit?: number = 10;

  @ApiProperty({ required: false, description: 'Filter by booking status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ required: false, description: 'Filter by event ID' })
  @IsOptional()
  @IsString()
  eventId?: string;
}

export class GetEventsQueryDto {
  @ApiProperty({ required: false, default: 1, description: 'Page number' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ required: false, default: 10, description: 'Items per page' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  limit?: number = 10;

  @ApiProperty({ required: false, description: 'Start date filter' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ required: false, description: 'End date filter' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    enum: DashboardPeriod,
    required: false,
    description: 'Period filter',
  })
  @IsOptional()
  @IsEnum(DashboardPeriod)
  period?: DashboardPeriod;

  @ApiProperty({ required: false, description: 'Category filter' })
  @IsOptional()
  @IsString()
  category?: string;
}

export class GetAnalyticsQueryDto {
  @ApiProperty({
    enum: DashboardPeriod,
    required: false,
    default: DashboardPeriod.MONTH,
  })
  @IsOptional()
  @IsEnum(DashboardPeriod)
  period?: DashboardPeriod = DashboardPeriod.MONTH;

  @ApiProperty({
    required: false,
    description: 'Specific event ID for analytics',
  })
  @IsOptional()
  @IsString()
  eventId?: string;
}

export class GetTimelineQueryDto {
  @ApiProperty({
    required: false,
    default: 30,
    description: 'Number of days to analyze',
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  days?: number = 30;
}
