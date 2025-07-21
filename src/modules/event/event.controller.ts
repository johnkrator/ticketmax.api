import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiResponse,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { EventService } from './event.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { FilterEventDto } from './dto/filter-event.dto';
import { Event } from './entities/event.entity';
import {
  CacheKey,
  CacheTTL,
  CACHE_TIMES,
} from '../../configurations/cache-config/cache.decorators';
import {
  ThrottleMedium,
  ThrottleShort,
} from '../../configurations/throttler-config/throttler.decorators';

@ApiTags('events')
@Controller('events')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Post()
  @ThrottleMedium()
  @ApiOperation({ summary: 'Create a new event' })
  @ApiResponse({
    status: 201,
    description: 'Event created successfully',
    type: Event,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async create(@Body() createEventDto: CreateEventDto): Promise<Event> {
    return await this.eventService.create(createEventDto);
  }

  @Get()
  @ThrottleShort()
  @CacheKey('events-all')
  @CacheTTL(CACHE_TIMES.MEDIUM)
  @ApiOperation({ summary: 'Get all events with optional filtering' })
  @ApiResponse({ status: 200, description: 'Events retrieved successfully' })
  async findAll(@Query() filterDto: FilterEventDto) {
    return await this.eventService.findAll(filterDto);
  }

  @Get('featured')
  @ThrottleShort()
  @CacheKey('events-featured')
  @CacheTTL(CACHE_TIMES.LONG)
  @ApiOperation({ summary: 'Get featured events' })
  @ApiResponse({
    status: 200,
    description: 'Featured events retrieved successfully',
    type: [Event],
  })
  async getFeaturedEvents(): Promise<Event[]> {
    return await this.eventService.getFeaturedEvents();
  }

  @Get('statistics')
  @ThrottleMedium()
  @CacheKey('events-statistics')
  @CacheTTL(CACHE_TIMES.MEDIUM)
  @ApiOperation({ summary: 'Get event statistics' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  async getStatistics(@Query('organizerId') organizerId?: string) {
    return await this.eventService.getEventStatistics(organizerId);
  }

  @Get('category/:category')
  @ThrottleShort()
  @CacheKey('events-category')
  @CacheTTL(CACHE_TIMES.LONG)
  @ApiOperation({ summary: 'Get events by category' })
  @ApiResponse({
    status: 200,
    description: 'Events by category retrieved successfully',
    type: [Event],
  })
  async getEventsByCategory(
    @Param('category') category: string,
  ): Promise<Event[]> {
    return await this.eventService.getEventsByCategory(category);
  }

  @Get('organizer/:organizerId')
  @ThrottleShort()
  @CacheKey('events-organizer')
  @CacheTTL(CACHE_TIMES.MEDIUM)
  @ApiOperation({ summary: 'Get events by organizer' })
  @ApiResponse({
    status: 200,
    description: 'Organizer events retrieved successfully',
    type: [Event],
  })
  async getEventsByOrganizer(
    @Param('organizerId') organizerId: string,
  ): Promise<Event[]> {
    return await this.eventService.findByOrganizer(organizerId);
  }

  @Get(':id')
  @ThrottleShort()
  @CacheKey('event-detail')
  @CacheTTL(CACHE_TIMES.MEDIUM)
  @ApiOperation({ summary: 'Get event by ID' })
  @ApiResponse({
    status: 200,
    description: 'Event retrieved successfully',
    type: Event,
  })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async findOne(@Param('id') id: string): Promise<Event> {
    return await this.eventService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update event by ID' })
  @ApiResponse({
    status: 200,
    description: 'Event updated successfully',
    type: Event,
  })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async update(
    @Param('id') id: string,
    @Body() updateEventDto: UpdateEventDto,
  ): Promise<Event> {
    return await this.eventService.update(id, updateEventDto);
  }

  @Patch(':id/attendees')
  @ApiOperation({ summary: 'Update attendee count for an event' })
  @ApiResponse({
    status: 200,
    description: 'Attendee count updated successfully',
    type: Event,
  })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async updateAttendeeCount(
    @Param('id') id: string,
    @Body('increment') increment: number = 1,
  ): Promise<Event> {
    return await this.eventService.updateAttendeeCount(id, increment);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete event by ID' })
  @ApiResponse({ status: 204, description: 'Event deleted successfully' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async remove(@Param('id') id: string): Promise<void> {
    return await this.eventService.remove(id);
  }

  // Relationship endpoints
  @Post(':id/attend')
  @ApiOperation({ summary: 'Add user as attendee to event' })
  @ApiResponse({
    status: 200,
    description: 'User added as attendee successfully',
    type: Event,
  })
  async addAttendee(
    @Param('id') eventId: string,
    @Body('userId') userId: string,
  ): Promise<Event> {
    return await this.eventService.addAttendee(eventId, userId);
  }

  @Delete(':id/attend/:userId')
  @ApiOperation({ summary: 'Remove user from event attendees' })
  @ApiResponse({
    status: 200,
    description: 'User removed from attendees successfully',
    type: Event,
  })
  async removeAttendee(
    @Param('id') eventId: string,
    @Param('userId') userId: string,
  ): Promise<Event> {
    return await this.eventService.removeAttendee(eventId, userId);
  }

  @Post(':id/favorite')
  @ApiOperation({ summary: 'Toggle favorite status for event' })
  @ApiResponse({
    status: 200,
    description: 'Favorite status toggled successfully',
    type: Event,
  })
  async toggleFavorite(
    @Param('id') eventId: string,
    @Body('userId') userId: string,
  ): Promise<Event> {
    return await this.eventService.toggleFavorite(eventId, userId);
  }

  @Get('user/:userId/created')
  @ApiOperation({ summary: 'Get events created by user' })
  @ApiResponse({
    status: 200,
    description: 'User created events retrieved successfully',
    type: [Event],
  })
  async getEventsByUser(@Param('userId') userId: string): Promise<Event[]> {
    return await this.eventService.getEventsByUser(userId);
  }

  @Get('user/:userId/attending')
  @ApiOperation({ summary: 'Get events user is attending' })
  @ApiResponse({
    status: 200,
    description: 'User attending events retrieved successfully',
    type: [Event],
  })
  async getAttendingEvents(@Param('userId') userId: string): Promise<Event[]> {
    return await this.eventService.getAttendingEvents(userId);
  }

  @Get('user/:userId/favorites')
  @ApiOperation({ summary: 'Get user favorite events' })
  @ApiResponse({
    status: 200,
    description: 'User favorite events retrieved successfully',
    type: [Event],
  })
  async getFavoriteEvents(@Param('userId') userId: string): Promise<Event[]> {
    return await this.eventService.getFavoriteEvents(userId);
  }
}
