import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsNumber, IsDateString, IsOptional, IsBoolean, Min, Max } from 'class-validator';
import { GradeType, Semester } from '../entities/grade.entity';

export class CreateGradeDto {
  @ApiProperty()
  @IsString()
  studentId: string;

  @ApiProperty()
  @IsString()
  subjectId: string;

  @ApiProperty()
  @IsString()
  classId: string;

  @ApiProperty()
  @IsString()
  schoolId: string;

  @ApiProperty()
  @IsString()
  academicYearId: string;

  @ApiProperty({ enum: Semester })
  @IsEnum(Semester)
  semester: Semester;

  @ApiProperty({ enum: GradeType })
  @IsEnum(GradeType)
  gradeType: GradeType;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  examNumber?: number;

  @ApiProperty({ minimum: 0, maximum: 10 })
  @IsNumber()
  @Min(0)
  @Max(10)
  score: number;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  coefficient?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiProperty()
  @IsDateString()
  examDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  teacherId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
