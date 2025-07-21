import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsDateString, IsEnum } from 'class-validator';

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
}

export class UserTicketsSummaryDto {
  @ApiProperty({ description: 'Total amount spent' })
  totalAmount: number;

  @ApiProperty({ description: 'Total tickets purchased' })
  totalTickets: number;

  @ApiProperty({ description: 'Number of confirmed tickets' })
  confirmedTickets: number;

  @ApiProperty({ description: 'Number of pending tickets' })
  pendingTickets: number;
}

export class UserEventsSummaryDto {
  @ApiProperty({ description: 'Total revenue from all events' })
  totalRevenue: number;

  @ApiProperty({ description: 'Total tickets sold across all events' })
  totalTicketsSold: number;

  @ApiProperty({ description: 'Average tickets sold per event' })
  averageTicketsSold: number;

  @ApiProperty({ description: 'Number of upcoming events' })
  upcomingEvents: number;

  @ApiProperty({ description: 'Number of past events' })
  pastEvents: number;
}

export class UserTicketsResponseDto {
  @ApiProperty({ type: [UserTicketDto], description: 'Array of user tickets' })
  tickets: UserTicketDto[];

  @ApiProperty({ type: PaginationDto, description: 'Pagination information' })
  pagination: PaginationDto;

  @ApiProperty({ type: UserTicketsSummaryDto, description: 'Tickets summary' })
  summary: UserTicketsSummaryDto;
}

export class UserEventsResponseDto {
  @ApiProperty({ type: [UserEventDto], description: 'Array of user events' })
  events: UserEventDto[];

  @ApiProperty({ type: PaginationDto, description: 'Pagination information' })
  pagination: PaginationDto;

  @ApiProperty({ type: UserEventsSummaryDto, description: 'Events summary' })
  summary: UserEventsSummaryDto;
}

export class RevenueDataDto {
  @ApiProperty({ description: 'Month in YYYY-MM format' })
  month: string;

  @ApiProperty({ description: 'Revenue for the month' })
  revenue: number;

  @ApiProperty({ description: 'Tickets sold in the month' })
  tickets: number;

  @ApiProperty({ description: 'Number of orders in the month' })
  orders: number;

  @ApiProperty({ description: 'Average order value for the month' })
  averageOrderValue: number;
}

export class TopEventDto {
  @ApiProperty({ description: 'Event title' })
  eventTitle: string;

  @ApiProperty({ description: 'Event category' })
  eventCategory: string;

  @ApiProperty({ description: 'Event date' })
  eventDate: string;

  @ApiProperty({ description: 'Total revenue' })
  revenue: number;

  @ApiProperty({ description: 'Total tickets sold' })
  tickets: number;

  @ApiProperty({ description: 'Total number of orders' })
  orders: number;

  @ApiProperty({ description: 'Average order value' })
  averageOrderValue: number;
}

export class SalesTrendDto {
  @ApiProperty({ description: 'Date in YYYY-MM-DD format' })
  date: string;

  @ApiProperty({ description: 'Revenue for the day' })
  revenue: number;

  @ApiProperty({ description: 'Tickets sold on the day' })
  tickets: number;

  @ApiProperty({ description: 'Number of orders on the day' })
  orders: number;
}

export class CategoryPerformanceDto {
  @ApiProperty({ description: 'Event category' })
  category: string;

  @ApiProperty({ description: 'Total revenue for category' })
  revenue: number;

  @ApiProperty({ description: 'Total tickets sold for category' })
  tickets: number;

  @ApiProperty({ description: 'Number of events in category' })
  eventCount: number;
}

export class AnalyticsDto {
  @ApiProperty({ type: [RevenueDataDto], description: 'Revenue data by month' })
  revenueByMonth: RevenueDataDto[];

  @ApiProperty({ type: [TopEventDto], description: 'Top performing events' })
  topEvents: TopEventDto[];

  @ApiProperty({ type: [SalesTrendDto], description: 'Daily sales trends' })
  salesTrends: SalesTrendDto[];

  @ApiProperty({
    type: [CategoryPerformanceDto],
    description: 'Category performance data',
  })
  categoryPerformance: CategoryPerformanceDto[];
}

export class ActivityDto {
  @ApiProperty({ description: 'Activity ID' })
  id: string;

  @ApiProperty({ description: 'Activity type' })
  type: string;

  @ApiProperty({ description: 'Activity title' })
  title: string;

  @ApiProperty({ description: 'Activity description' })
  description: string;

  @ApiProperty({ description: 'Activity timestamp' })
  timestamp: Date;

  @ApiProperty({ description: 'Activity status' })
  status: string;

  @ApiProperty({ description: 'Additional metadata', required: false })
  metadata?: {
    amount?: number;
    ticketType?: string;
    eventCategory?: string;
    category?: string;
    totalTickets?: number;
    price?: string;
    refundAmount?: number;
    quantity?: number;
  };
}
