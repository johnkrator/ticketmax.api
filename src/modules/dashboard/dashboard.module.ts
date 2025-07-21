import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { TicketVerificationService } from './ticket-verification.service';
import { Event, EventSchema } from '../event/entities/event.entity';
import { Booking, BookingSchema } from '../booking/entities/booking.entity';
import { User, UserSchema } from '../user/entities/user.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Event.name, schema: EventSchema },
      { name: Booking.name, schema: BookingSchema },
      { name: User.name, schema: UserSchema },
    ]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [DashboardController],
  providers: [DashboardService, TicketVerificationService],
  exports: [DashboardService, TicketVerificationService],
})
export class DashboardModule {}
