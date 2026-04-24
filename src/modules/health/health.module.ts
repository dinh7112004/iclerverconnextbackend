import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthNote } from './entities/health-note.entity';
import { Student } from '../students/entities/student.entity';
import { HealthService } from './health.service';
import { HealthController } from './health.controller';
import { MedicineInstruction } from './entities/medicine-instruction.entity';

@Module({
  imports: [TypeOrmModule.forFeature([HealthNote, Student, MedicineInstruction])],
  controllers: [HealthController],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {}
