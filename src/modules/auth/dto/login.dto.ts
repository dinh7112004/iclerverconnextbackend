import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email or phone number',
  })
  @IsString()
  @IsNotEmpty()
  identifier: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({
    required: false,
    example: {
      deviceType: 'mobile',
      deviceId: 'device_abc123',
      os: 'iOS 15',
      appVersion: '1.0.0',
    },
  })
  @IsOptional()
  @IsObject()
  deviceInfo?: {
    deviceType?: string;
    deviceId?: string;
    os?: string;
    appVersion?: string;
  };
}
