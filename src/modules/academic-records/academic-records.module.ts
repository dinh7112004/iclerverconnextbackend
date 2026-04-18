import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AcademicRecordsService } from './academic-records.service';
import { AcademicRecordsController } from './academic-records.controller';
import { Grade } from './entities/grade.entity';
import { AcademicSummary } from './entities/academic-summary.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Grade, AcademicSummary])],
  controllers: [AcademicRecordsController],
  providers: [AcademicRecordsService],
  exports: [AcademicRecordsService],
})
export class AcademicRecordsModule {}
