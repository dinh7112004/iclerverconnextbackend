import { ConfigService } from '@nestjs/config';
import { MongooseModuleOptions } from '@nestjs/mongoose';

export const mongooseConfig = (
  configService: ConfigService,
): MongooseModuleOptions => ({
  uri: configService.get('MONGODB_URI'),
  connectionFactory: (connection) => {
    connection.on('connected', () => {
      console.log('✅ MongoDB is connected');
    });
    connection.on('disconnected', () => {
      console.log('❌ MongoDB is disconnected');
    });
    connection.on('error', (error) => {
      console.error('❌ MongoDB connection error:', error);
    });
    return connection;
  },
});
