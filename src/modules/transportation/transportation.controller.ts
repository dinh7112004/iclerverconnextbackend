import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { TransportationService } from './transportation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Transportation')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('transportation')
export class TransportationController {
  constructor(private readonly transportationService: TransportationService) {}

  @Get('student/:studentId')
  @ApiOperation({ summary: 'Lấy thông tin xe đưa đón của học sinh' })
  async getStudentBusInfo(@Param('studentId') studentId: string) {
    const data = await this.transportationService.getStudentBusInfo(studentId);
    return {
      success: true,
      data,
    };
  }

  @Get('routes')
  @ApiOperation({ summary: 'Lấy danh sách tất cả các tuyến xe' })
  async getAllRoutes() {
    const data = await this.transportationService.getAllRoutes();
    return {
      success: true,
      data,
    };
  }
}
