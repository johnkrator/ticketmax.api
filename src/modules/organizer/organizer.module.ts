import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { OrganizerController } from './organizer.controller';
import { OrganizerService } from './organizer.service';
import { OrganizerEmailService } from './organizer-email.service';
import { OrganizerValidationService } from './organizer-validation.service';
import { FileStorageService } from './file-storage.service';
import { Organizer, OrganizerSchema } from './entities/organizer.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Organizer.name, schema: OrganizerSchema },
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'fallback-secret-key',
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
    }),
  ],
  controllers: [OrganizerController],
  providers: [
    OrganizerService,
    OrganizerEmailService,
    OrganizerValidationService,
    FileStorageService,
  ],
  exports: [OrganizerService],
})
export class OrganizerModule {}
