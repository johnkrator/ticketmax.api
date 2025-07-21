import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Delete,
  UseGuards,
  Request,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { FilterBookingDto } from './dto/filter-booking.dto';
import { JwtGuard } from '../../configurations/jwt_configuration/jwt-guard';

@ApiTags('Bookings')
@Controller('bookings')
@UseGuards(JwtGuard)
@ApiBearerAuth()
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new booking' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Booking created successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid booking data or insufficient tickets',
  })
  async create(@Body() createBookingDto: CreateBookingDto, @Request() req) {
    const userId = req.user.userId;
    return await this.bookingService.create(createBookingDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get user booking history with filters' })
  @ApiQuery({ name: 'search', required: false, description: 'Search term' })
  @ApiQuery({ name: 'status', required: false, description: 'Booking status' })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Filter start date',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'Filter end date',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Booking history retrieved successfully',
  })
  async findUserBookings(@Query() filterDto: FilterBookingDto, @Request() req) {
    const userId = req.user.userId;
    return await this.bookingService.findUserBookings(userId, filterDto);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get user booking statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Booking statistics retrieved successfully',
  })
  async getBookingStats(@Request() req) {
    const userId = req.user.userId;
    return await this.bookingService.getBookingStats(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get booking by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Booking retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Booking not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied to this booking',
  })
  async findOne(@Param('id') id: string, @Request() req) {
    const userId = req.user.userId;
    return await this.bookingService.findById(id, userId);
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: 'Confirm a pending booking' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Booking confirmed successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Booking not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Only pending bookings can be confirmed',
  })
  async confirmBooking(@Param('id') id: string) {
    return await this.bookingService.confirmBooking(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel a booking' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Booking cancelled successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Booking not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied to this booking',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot cancel booking (e.g., too close to event time)',
  })
  async cancelBooking(@Param('id') id: string, @Request() req) {
    const userId = req.user.userId;
    return await this.bookingService.cancelBooking(id, userId);
  }
}
