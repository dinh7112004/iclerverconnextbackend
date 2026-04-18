import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsObject,
  IsArray,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportType, ReportFormat, ReportSchedule } from '../entities/report.entity';

export class CreateReportDto {
  @ApiProperty({
    description: 'Tên báo cáo',
    example: 'Báo cáo điểm số tháng 11/2024',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Mô tả báo cáo',
    example: 'Báo cáo tổng hợp điểm số của tất cả học sinh',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Loại báo cáo',
    enum: ReportType,
    example: ReportType.GRADES,
  })
  @IsEnum(ReportType)
  type: ReportType;

  @ApiPropertyOptional({
    description: 'Định dạng xuất',
    enum: ReportFormat,
    example: ReportFormat.PDF,
  })
  @IsEnum(ReportFormat)
  @IsOptional()
  format?: ReportFormat;

  @ApiPropertyOptional({
    description: 'Bộ lọc dữ liệu',
    example: {
      startDate: '2024-11-01',
      endDate: '2024-11-30',
      classId: '123',
    },
  })
  @IsObject()
  @IsOptional()
  filters?: {
    startDate?: string;
    endDate?: string;
    classId?: string;
    studentId?: string;
    teacherId?: string;
    subjectId?: string;
    gradeLevel?: string;
    [key: string]: any;
  };

  @ApiPropertyOptional({
    description: 'Cấu hình báo cáo',
    example: {
      includeCharts: true,
      includeStatistics: true,
      groupBy: 'class',
    },
  })
  @IsObject()
  @IsOptional()
  config?: {
    includeCharts?: boolean;
    includeStatistics?: boolean;
    groupBy?: string;
    sortBy?: string;
    limit?: number;
    [key: string]: any;
  };

  @ApiPropertyOptional({
    description: 'Lên lịch tự động',
    example: false,
  })
  @IsBoolean()
  @IsOptional()
  isScheduled?: boolean;

  @ApiPropertyOptional({
    description: 'Chu kỳ lên lịch',
    enum: ReportSchedule,
    example: ReportSchedule.MONTHLY,
  })
  @IsEnum(ReportSchedule)
  @IsOptional()
  schedule?: ReportSchedule;

  @ApiPropertyOptional({
    description: 'Danh sách email nhận báo cáo',
    example: ['teacher@school.edu.vn', 'admin@school.edu.vn'],
  })
  @IsArray()
  @IsOptional()
  recipients?: string[];

  @ApiPropertyOptional({
    description: 'Gửi email khi hoàn thành',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  sendEmail?: boolean;
}
