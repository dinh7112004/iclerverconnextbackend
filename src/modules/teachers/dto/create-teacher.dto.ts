import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsDateString,
  IsOptional,
  IsEnum,
  IsUUID,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class CreateTeacherDto {
  @ApiProperty({ example: 'An' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  firstName: string;

  @ApiProperty({ example: 'Trần' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  lastName: string;

  @ApiPropertyOptional({ example: '1985-08-15' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ enum: ['male', 'female', 'other'], example: 'female' })
  @IsOptional()
  @IsEnum(['male', 'female', 'other'])
  gender?: string;

  @ApiPropertyOptional({ example: '0912345678' })
  @IsOptional()
  @IsString()
  @Matches(/^(\+84|0)[0-9]{9}$/, {
    message: 'Phone number must be a valid Vietnamese phone number',
  })
  phone?: string;

  @ApiPropertyOptional({ example: 'teacher@school.edu.vn' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '123 Đường ABC, Quận 1, TP.HCM' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({
    description: 'UUID of the school',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  schoolId: string;

  @ApiPropertyOptional({
    example: 'Toán học',
    description: 'Primary subject specialization',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  specialization?: string;

  @ApiPropertyOptional({
    example: 'Thạc sĩ Sư phạm Toán',
    description: 'Highest degree obtained',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  degree?: string;

  @ApiPropertyOptional({
    example: '2020-09-01',
    description: 'Date when teacher was hired',
  })
  @IsOptional()
  @IsDateString()
  hireDate?: string;

  @ApiPropertyOptional({
    enum: ['active', 'inactive', 'on_leave', 'terminated'],
    default: 'active',
  })
  @IsOptional()
  @IsEnum(['active', 'inactive', 'on_leave', 'terminated'])
  status?: string;
}
