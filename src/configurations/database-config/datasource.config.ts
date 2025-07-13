import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { ConfigService } from '@nestjs/config';
import {
  MongooseModuleAsyncOptions,
  MongooseModuleOptions,
} from '@nestjs/mongoose';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env') });

export const createMongooseConfig = async (
  configService: ConfigService,
): Promise<MongooseModuleOptions> => {
  const uri =
    configService.get<string>('MONGODB_URI') ||
    configService.get<string>('DATABASE_URL') ||
    'mongodb://localhost:27017/ticketpromax';

  // Validate URI format
  if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
    throw new Error(`Invalid MongoDB URI format: ${uri}`);
  }

  // Check for proper URI structure
  const uriPattern = /^mongodb(\+srv)?:\/\/[^:]+:[^@]+@[^\/]+\/[^?]*/;
  if (!uriPattern.test(uri)) {
    throw new Error(`Invalid MongoDB URI: Check your credentials format`);
  }

  // Log connection without credentials
  console.log(
    'Connecting to MongoDB:',
    uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'),
  );

  return {
    uri,
    maxPoolSize: 10,
    minPoolSize: 5,
    maxIdleTimeMS: 30000,
    serverSelectionTimeoutMS: 60000,
    socketTimeoutMS: 45000,
    connectTimeoutMS: 60000,
    retryWrites: true,
    w: 'majority',
    dbName: configService.get<string>('DB_NAME') || 'ticketpromax',
  };
};

export const mongooseAsyncConfig: MongooseModuleAsyncOptions = {
  useFactory: createMongooseConfig,
  inject: [ConfigService],
};
