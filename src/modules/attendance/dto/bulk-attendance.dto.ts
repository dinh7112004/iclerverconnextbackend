import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, IsEnum, IsDateString } from 'class-validator';
import { AttendanceStatus } from '../entities/attendance.entity';

export class BulkAttendanceDto {
  @ApiProperty()
  @IsString()
  classId: string;

  @ApiProperty()
  @IsString()
  schoolId: string;

  @ApiProperty()
  @IsDateString()
  date: string;

  @ApiProperty()
  @IsString()
  session: string;

  @ApiProperty({ type: [Object] })
  @IsArray()
  attendance: Array<{
    studentId: string;
    status: AttendanceStatus;
    note?: string;
    reason?: string;
    checkInTime?: string;
    checkOutTime?: string;
  }>;
}
