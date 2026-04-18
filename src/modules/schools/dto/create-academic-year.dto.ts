import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsDateString, IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class CreateAcademicYearDto {
  @ApiProperty({
    description: 'UUID of the school',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  schoolId: string;

  @ApiProperty({ example: '2024-2025' })
  @IsString()
  name: string;

  @ApiProperty({ example: '2024-09-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2025-05-31' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isCurrent?: boolean;
}
