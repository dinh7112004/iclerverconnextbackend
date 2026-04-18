import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, IsEnum } from 'class-validator';
import { CreateScheduleDto } from './create-schedule.dto';
import { Semester } from '../../academic-records/entities/grade.entity';

export class BulkScheduleDto {
  @ApiProperty()
  @IsString()
  classId: string;

  @ApiProperty()
  @IsString()
  academicYearId: string;

  @ApiProperty({ enum: Semester })
  @IsEnum(Semester)
  semester: Semester;

  @ApiProperty({ type: [CreateScheduleDto] })
  @IsArray()
  schedules: CreateScheduleDto[];
}
