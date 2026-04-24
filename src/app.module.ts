// AppModule - Updated with GamesModule for Grade-Specific Curriculum Minigames
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bull';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { createClient } from 'redis';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { typeOrmConfig } from './config/typeorm.config';
import { mongooseConfig } from './config/mongoose.config';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { StudentsModule } from './modules/students/students.module';
import { TeachersModule } from './modules/teachers/teachers.module';
import { ParentsModule } from './modules/parents/parents.module';
import { SchoolsModule } from './modules/schools/schools.module';
import { ClassesModule } from './modules/classes/classes.module';
import { SubjectsModule } from './modules/subjects/subjects.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { SchedulesModule } from './modules/schedules/schedules.module';
import { AcademicRecordsModule } from './modules/academic-records/academic-records.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { LMSModule } from './modules/lms/lms.module';
import { NutritionModule } from './modules/nutrition/nutrition.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { ReportsModule } from './modules/reports/reports.module';
import { HealthModule } from './modules/health/health.module';
import { GamesModule } from './modules/games/games.module';
import { TransportationModule } from './modules/transportation/transportation.module';
import { LeaveRequestsModule } from './modules/leave-requests/leave-requests.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { LibraryModule } from './modules/library/library.module';
import { SurveysModule } from './modules/surveys/surveys.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // PostgreSQL
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        ...typeOrmConfig(configService),
        autoLoadEntities: true,
      }),
      inject: [ConfigService],
    }),

    // MongoDB
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: mongooseConfig,
      inject: [ConfigService],
    }),

    // Caching
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const redisUrl = configService.get('REDIS_URL');
        if (redisUrl) {
          try {
            console.log('Developing Manual Redis Client...');
            const client = createClient({
              url: redisUrl,
              socket: {
                reconnectStrategy: (retries) => {
                  if (retries > 10) {
                    console.error('Redis Max Retries Reached. Falling back.');
                    return new Error('Redis connection failed');
                  }
                  return Math.min(retries * 100, 3000);
                },
                connectTimeout: 10000,
              },
            });

            // CRITICAL: Attach error listener to prevent process exit on unhandled event
            client.on('error', (err) => {
              console.error('Redis Client Error Listener:', err.message);
            });

            console.log('Connecting to Redis...');
            await client.connect();
            console.log('Redis Client connected.');

            const store = await redisStore({
              redisInstance: client,
              ttl: 600000, // 10 minutes
            } as any);

            console.log('Redis Cache Store initialized.');
            // Cast to any to avoid TS union type mismatch between RedisStore and 'memory' string
            return {
              store,
            } as any;
          } catch (error) {
            console.error('Failed to initialize Redis Cache:', error.message);
            console.log('Fallback to memory cache enabled.');
          }
        }
        return {
          store: 'memory',
          ttl: 300000, // 5 minutes
        } as any;
      },
      inject: [ConfigService],
    }),

    // Rate Limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests
      },
    ]),

    // Task Scheduling
    ScheduleModule.forRoot(),

    // Queue Management
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const redisUrl = configService.get('REDIS_URL');
        if (redisUrl) {
          return { url: redisUrl };
        }
        return {
          redis: {
            host: configService.get('REDIS_HOST') || 'localhost',
            port: configService.get('REDIS_PORT') || 6379,
          },
        };
      },
      inject: [ConfigService],
    }),

    // Application Modules
    AuthModule,
    UsersModule,
    StudentsModule,
    TeachersModule,
    ParentsModule,
    SchoolsModule,
    ClassesModule,
    SubjectsModule,
    AttendanceModule,
    SchedulesModule,
    AcademicRecordsModule,
    NotificationsModule,
    PaymentsModule,
    LMSModule,
    NutritionModule,
    MessagingModule,
    ReportsModule,
    HealthModule,
    GamesModule,
    TransportationModule,
    LeaveRequestsModule,
    UploadsModule,
    LibraryModule,
    SurveysModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
