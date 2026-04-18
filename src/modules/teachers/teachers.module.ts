import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Teacher } from './entities/teacher.entity';
import { User } from '../users/entities/user.entity';
import { School } from '../schools/entities/school.entity';
import { TeachersService } from './teachers.service';
import { TeachersController } from './teachers.controller';
import { AuthModule } from '../auth/auth.module';
import { Class } from '../classes/entities/class.entity';
import { Schedule } from '../schedules/entities/schedule.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Teacher, User, School, Class, Schedule]),
    AuthModule,
  ],
  controllers: [TeachersController],
  providers: [TeachersService],
  exports: [TypeOrmModule, TeachersService],
})
export class TeachersModule {}
