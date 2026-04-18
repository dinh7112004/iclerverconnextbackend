import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsNumber, IsDateString, IsOptional, IsArray, IsBoolean } from 'class-validator';
import { ExamType } from '../entities/exam-schedule.entity';

export class CreateExamScheduleDto {
  @ApiProperty()
  @IsString()
  examName: string;

  @ApiProperty({ enum: ExamType })
  @IsEnum(ExamType)
  examType: ExamType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  classId?: string;

  @ApiProperty()
  @IsString()
  schoolId: string;

  @ApiProperty()
  @IsString()
  subjectId: string;

  @ApiProperty()
  @IsDateString()
  examDate: string;

  @ApiProperty()
  @IsString()
  startTime: string;

  @ApiProperty()
  @IsString()
  endTime: string;

  @ApiProperty()
  @IsNumber()
  duration: number;

  @ApiProperty()
  @IsString()
  room: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supervisorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  coSupervisors?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  totalStudents?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  examFormat?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  examContent?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  requirements?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
