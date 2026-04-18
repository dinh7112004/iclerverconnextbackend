import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateClassDto {
  @ApiProperty({
    description: 'UUID of the school',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  schoolId: string;

  @ApiProperty({
    description: 'UUID of the grade',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID()
  gradeId: string;

  @ApiProperty({
    description: 'UUID of the academic year',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @IsUUID()
  academicYearId: string;

  @ApiProperty({ example: '5A', description: 'Class name (e.g., 5A, 5B)' })
  @IsString()
  @MaxLength(50)
  name: string;

  @ApiProperty({
    example: '2024-5A-NVT',
    description: 'Unique class code',
  })
  @IsString()
  @MaxLength(50)
  code: string;

  @ApiPropertyOptional({
    description: 'UUID of the homeroom teacher',
    example: '550e8400-e29b-41d4-a716-446655440003',
  })
  @IsOptional()
  @IsUUID()
  homeroomTeacherId?: string;

  @ApiPropertyOptional({
    example: 40,
    description: 'Maximum number of students allowed in class',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxStudents?: number;

  @ApiPropertyOptional({
    example: 'Room 201',
    description: 'Classroom location',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  room?: string;
}
