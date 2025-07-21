import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { OrganizerController } from './organizer.controller';
import { OrganizerService } from './organizer.service';
import { OrganizerEmailService } from './organizer-email.service';
import { OrganizerValidationService } from './organizer-validation.service';
import { FileStorageService } from './file-storage.service';
import { CloudStorageService } from './cloud-storage.service';
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
    ConfigModule,
  ],
  controllers: [OrganizerController],
  providers: [
    OrganizerService,
    OrganizerEmailService,
    OrganizerValidationService,
    FileStorageService,
    CloudStorageService,
  ],
  exports: [OrganizerService, CloudStorageService, FileStorageService],
})
export class OrganizerModule {}
