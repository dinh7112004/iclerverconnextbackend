import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsInt, IsOptional, IsUUID, Min, Max } from 'class-validator';

export class CreateGradeDto {
  @ApiProperty({
    description: 'UUID of the school',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  schoolId: string;

  @ApiProperty({ example: 'Khối 5' })
  @IsString()
  name: string;

  @ApiProperty({ example: 5, description: 'Grade level (1-12)' })
  @IsInt()
  @Min(1)
  @Max(12)
  gradeLevel: number;

  @ApiPropertyOptional({ example: 'Grade 5 - Elementary School' })
  @IsOptional()
  @IsString()
  description?: string;
}
