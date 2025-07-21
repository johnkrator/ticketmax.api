import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { FilterEventDto } from './dto/filter-event.dto';
import { Event, EventDocument } from './entities/event.entity';

@Injectable()
export class EventService {
  constructor(
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
  ) {}

  async create(createEventDto: CreateEventDto): Promise<Event> {
    try {
      // Set the default image if not provided
      if (!createEventDto.image) {
        createEventDto.image =
          'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&h=600&fit=crop';
      }

      const createdEvent = new this.eventModel({
        ...createEventDto,
        attendeeUsers: [], // Initialize an empty attendees array
        favoritedBy: [], // Initialize an empty favorites array
        ticketsSold: 0,
      });

      return await createdEvent.save();
    } catch (error) {
      throw new BadRequestException('Failed to create event: ' + error.message);
    }
  }

  async findAll(filterDto?: FilterEventDto): Promise<{
    events: Event[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const {
      search,
      category,
      location,
      featured,
      organizerId,
      status,
      page = 1,
      limit = 10,
    } = filterDto || {};

    // Build filter query
    const filter: any = {};

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
      ];
    }

    if (category && category !== 'all') {
      filter.category = category;
    }

    if (location && location !== 'all') {
      filter.location = { $regex: location, $options: 'i' };
    }

    if (featured !== undefined) {
      filter.featured = featured;
    }

    if (organizerId) {
      filter.organizerId = organizerId;
    }

    if (status) {
      filter.status = status;
    } else {
      filter.status = 'active'; // Default to active events
    }

    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
      this.eventModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.eventModel.countDocuments(filter).exec(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      events,
      total,
      page,
      totalPages,
    };
  }

  async findOne(id: string): Promise<Event> {
    const event = await this.eventModel.findById(id).exec();
    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }
    return event;
  }

  async findByOrganizer(organizerId: string): Promise<Event[]> {
    return await this.eventModel
      .find({ organizerId })
      .sort({ createdAt: -1 })
      .exec();
  }

  async update(id: string, updateEventDto: UpdateEventDto): Promise<Event> {
    const updatedEvent = await this.eventModel
      .findByIdAndUpdate(id, updateEventDto, { new: true })
      .exec();

    if (!updatedEvent) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    return updatedEvent;
  }

  async remove(id: string): Promise<void> {
    const result = await this.eventModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }
  }

  async getFeaturedEvents(): Promise<Event[]> {
    return await this.eventModel
      .find({ featured: true, status: 'active' })
      .sort({ createdAt: -1 })
      .limit(6)
      .exec();
  }

  async getEventsByCategory(category: string): Promise<Event[]> {
    return await this.eventModel
      .find({ category, status: 'active' })
      .sort({ createdAt: -1 })
      .exec();
  }

  async updateAttendeeCount(id: string, increment: number = 1): Promise<Event> {
    const event = await this.findOne(id);
    const currentAttendees = parseInt(event.attendees) || 0;
    const newAttendeeCount = Math.max(0, currentAttendees + increment);

    return await this.update(id, {
      attendees: newAttendeeCount.toString(),
      ticketsSold: event.ticketsSold + increment,
    });
  }

  async getEventStatistics(organizerId?: string): Promise<any> {
    const filter = organizerId ? { organizerId } : {};

    const [totalEvents, activeEvents, featuredEvents, totalTicketsSold] =
      await Promise.all([
        this.eventModel.countDocuments(filter).exec(),
        this.eventModel.countDocuments({ ...filter, status: 'active' }).exec(),
        this.eventModel.countDocuments({ ...filter, featured: true }).exec(),
        this.eventModel
          .aggregate([
            { $match: filter },
            { $group: { _id: null, total: { $sum: '$ticketsSold' } } },
          ])
          .exec(),
      ]);

    return {
      totalEvents,
      activeEvents,
      featuredEvents,
      totalTicketsSold: totalTicketsSold[0]?.total || 0,
    };
  }

  async addAttendee(eventId: string, userId: string): Promise<Event> {
    const event = await this.eventModel
      .findByIdAndUpdate(
        eventId,
        { $addToSet: { attendeeUsers: userId } },
        { new: true },
      )
      .populate('attendeeUsers', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email')
      .populate(
        'organizerId',
        'personalInformation.firstName personalInformation.lastName',
      )
      .exec();

    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    return event;
  }

  async removeAttendee(eventId: string, userId: string): Promise<Event> {
    const event = await this.eventModel
      .findByIdAndUpdate(
        eventId,
        { $pull: { attendeeUsers: userId } },
        { new: true },
      )
      .populate('attendeeUsers', 'firstName lastName email')
      .exec();

    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    return event;
  }

  async toggleFavorite(eventId: string, userId: string): Promise<Event> {
    const event = await this.findOne(eventId);
    const isFavorited = event.favoritedBy?.includes(userId as any);

    const updateOperation = isFavorited
      ? { $pull: { favoritedBy: userId } }
      : { $addToSet: { favoritedBy: userId } };

    const updatedEvent = await this.eventModel
      .findByIdAndUpdate(eventId, updateOperation, { new: true })
      .populate('favoritedBy', 'firstName lastName email')
      .exec();

    if (!updatedEvent) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    return updatedEvent;
  }

  async getEventsByUser(userId: string): Promise<Event[]> {
    return await this.eventModel
      .find({ createdBy: userId })
      .populate(
        'organizerId',
        'personalInformation.firstName personalInformation.lastName',
      )
      .sort({ createdAt: -1 })
      .exec();
  }

  async getAttendingEvents(userId: string): Promise<Event[]> {
    return await this.eventModel
      .find({ attendeeUsers: userId })
      .populate('createdBy', 'firstName lastName email')
      .populate(
        'organizerId',
        'personalInformation.firstName personalInformation.lastName',
      )
      .sort({ date: 1 })
      .exec();
  }

  async getFavoriteEvents(userId: string): Promise<Event[]> {
    return await this.eventModel
      .find({ favoritedBy: userId })
      .populate('createdBy', 'firstName lastName email')
      .populate(
        'organizerId',
        'personalInformation.firstName personalInformation.lastName',
      )
      .sort({ createdAt: -1 })
      .exec();
  }
}
