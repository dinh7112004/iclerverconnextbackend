import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { ReportType, ReportStatus } from './entities/report.entity';

@ApiTags('Reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post()
  @ApiOperation({
    summary: 'Tạo báo cáo mới',
    description: 'Tạo báo cáo mới và tự động bắt đầu xử lý',
  })
  @ApiResponse({ status: 201, description: 'Báo cáo đã được tạo' })
  async create(@Body() dto: CreateReportDto, @Request() req: any) {
    const userId = req.user?.id || 'anonymous';
    return this.reportsService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách báo cáo' })
  @ApiQuery({ name: 'type', required: false, enum: ReportType })
  @ApiQuery({ name: 'status', required: false, enum: ReportStatus })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  async findAll(
    @Request() req: any,
    @Query('type') type?: ReportType,
    @Query('status') status?: ReportStatus,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    const userId = req.user?.id || 'anonymous';
    return this.reportsService.findAll(userId, {
      type,
      status,
      limit: limit ? parseInt(limit) : undefined,
      skip: skip ? parseInt(skip) : undefined,
    });
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Lấy thống kê báo cáo' })
  async getStatistics(@Request() req: any) {
    const userId = req.user?.id || 'anonymous';
    return this.reportsService.getStatistics(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy chi tiết một báo cáo' })
  async findOne(@Param('id') id: string) {
    return this.reportsService.findById(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa báo cáo' })
  async delete(@Param('id') id: string, @Request() req: any) {
    const userId = req.user?.id || 'anonymous';
    const deleted = await this.reportsService.delete(id, userId);
    return { success: deleted };
  }
}
