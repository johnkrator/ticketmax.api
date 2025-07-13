import { Module } from '@nestjs/common';
import { AdminSeedService } from './admin-seed.service';
import { AdminSeedController } from './admin-seed.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../user/entities/user.entity';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  controllers: [AdminSeedController],
  providers: [AdminSeedService],
})
export class AdminSeedModule {}
