import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { ChatMessage } from './entities/chat-message.entity';
import { StudentsModule } from '../students/students.module';
import { SchedulesModule } from '../schedules/schedules.module';
import { AttendanceModule } from '../attendance/attendance.module';
import { AcademicRecordsModule } from '../academic-records/academic-records.module';
import { LeaveRequestsModule } from '../leave-requests/leave-requests.module';
import { NutritionModule } from '../nutrition/nutrition.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChatMessage]),
    StudentsModule,
    SchedulesModule,
    AttendanceModule,
    AcademicRecordsModule,
    LeaveRequestsModule,
    NutritionModule,
  ],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
