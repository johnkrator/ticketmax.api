import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './modules/user/user.module';
import { EventModule } from './modules/event/event.module';
import { mongooseAsyncConfig } from './configurations/database-config/datasource.config';
import { AdminSeedModule } from './modules/admin-seed/admin-seed.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRootAsync(mongooseAsyncConfig),
    UserModule,
    EventModule,
    AdminSeedModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
