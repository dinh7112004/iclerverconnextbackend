import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, IsEnum, IsDateString, IsNumber } from 'class-validator';
import { GradeType, Semester } from '../entities/grade.entity';

export class BulkGradeDto {
  @ApiProperty()
  @IsString()
  classId: string;

  @ApiProperty()
  @IsString()
  schoolId: string;

  @ApiProperty()
  @IsString()
  subjectId: string;

  @ApiProperty()
  @IsString()
  academicYearId: string;

  @ApiProperty({ enum: Semester })
  @IsEnum(Semester)
  semester: Semester;

  @ApiProperty({ enum: GradeType })
  @IsEnum(GradeType)
  gradeType: GradeType;

  @ApiProperty()
  @IsNumber()
  examNumber: number;

  @ApiProperty()
  @IsNumber()
  coefficient: number;

  @ApiProperty()
  @IsDateString()
  examDate: string;

  @ApiProperty({ type: [Object] })
  @IsArray()
  grades: Array<{
    studentId: string;
    score: number;
    comment?: string;
  }>;
}
