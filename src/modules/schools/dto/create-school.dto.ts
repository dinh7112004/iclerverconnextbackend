import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsUUID,
  IsUrl,
  IsObject,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class CreateSchoolDto {
  @ApiProperty({ example: 'Trường Tiểu học Nguyễn Văn Trỗi' })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  name: string;

  @ApiProperty({
    example: 'TH-NVT-001',
    description: 'Unique school code',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  code: string;

  @ApiPropertyOptional({
    enum: ['primary', 'middle', 'high', 'combined'],
    example: 'primary',
  })
  @IsOptional()
  @IsEnum(['primary', 'middle', 'high', 'combined'])
  schoolType?: string;

  @ApiPropertyOptional({ example: '123 Đường Nguyễn Văn Trỗi, Phường 8' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Quận Phú Nhuận' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  district?: string;

  @ApiPropertyOptional({ example: 'TP. Hồ Chí Minh' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({ example: '0281234567' })
  @IsOptional()
  @IsString()
  @Matches(/^(\+84|0)[0-9]{9,10}$/, {
    message: 'Phone number must be a valid Vietnamese phone number',
  })
  phone?: string;

  @ApiPropertyOptional({ example: 'contact@school.edu.vn' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'https://school.edu.vn' })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({ example: 'https://cdn.school.edu.vn/logo.png' })
  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @ApiPropertyOptional({
    description: 'UUID of the principal (user with PRINCIPAL role)',
  })
  @IsOptional()
  @IsUUID()
  principalId?: string;

  @ApiPropertyOptional({
    enum: ['active', 'inactive', 'suspended'],
    default: 'active',
  })
  @IsOptional()
  @IsEnum(['active', 'inactive', 'suspended'])
  status?: string;

  @ApiPropertyOptional({
    example: {
      academicStartMonth: 9,
      weekendDays: [0, 6],
      lunchBreak: { start: '11:30', end: '13:00' },
    },
    description: 'School-specific settings',
  })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}
