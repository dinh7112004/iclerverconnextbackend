import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchedulesService } from './schedules.service';
import { SchedulesController } from './schedules.controller';
import { Schedule } from './entities/schedule.entity';
import { ExamSchedule } from './entities/exam-schedule.entity';
import { TimeSlot } from './entities/time-slot.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Schedule, ExamSchedule, TimeSlot])],
  controllers: [SchedulesController],
  providers: [SchedulesService],
  exports: [SchedulesService],
})
export class SchedulesModule {}
