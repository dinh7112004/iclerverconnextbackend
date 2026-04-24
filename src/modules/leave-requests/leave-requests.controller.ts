import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { LeaveRequestsService } from './leave-requests.service';
import { LeaveRequestStatus } from './entities/leave-request.entity';

@Controller('leave-requests')
export class LeaveRequestsController {
  constructor(private readonly leaveRequestsService: LeaveRequestsService) {}

  @Post()
  async create(@Body() data: any) {
    const result = await this.leaveRequestsService.create(data);
    return {
      success: true,
      data: result,
    };
  }

  @Get()
  async findAll(
    @Query('studentId') studentId?: string,
    @Query('parentId') parentId?: string,
    @Query('status') status?: string,
  ) {
    const result = await this.leaveRequestsService.findAll({
      studentId,
      parentId,
      status,
    });
    
    // Formatting for the mobile app UI
    const formattedData = result.map(item => {
        const parseDate = (dStr: string) => {
            if (!dStr) return new Date(NaN);
            let d = new Date(dStr);
            if (!isNaN(d.getTime())) return d;
            const parts = dStr.split('/');
            if (parts.length === 3) return new Date(+parts[2], +parts[1] - 1, +parts[0]);
            return d;
        };

        let displayDate = '';
        if (item.type === 'day') {
            const from = parseDate(item.fromDate);
            const to = item.toDate ? parseDate(item.toDate) : from;
            if (isNaN(from.getTime())) {
                displayDate = item.fromDate || '---';
            } else {
                displayDate = from.toDateString() === to.toDateString() 
                    ? `${from.getDate()}/${from.getMonth() + 1}`
                    : `${from.getDate()}/${from.getMonth() + 1} - ${to.getDate()}/${to.getMonth() + 1}`;
            }
        } else {
            const single = parseDate(item.singleDate);
            displayDate = isNaN(single.getTime()) 
                ? (item.singleDate || '---')
                : `${single.getDate()}/${single.getMonth() + 1}`;
        }

        return {
            ...item.toObject(),
            id: item._id,
            displayDate,
            createdAt: item.createdAt ? new Date(item.createdAt).toLocaleDateString('vi-VN') : '',
            attachment: item.attachmentUrl ? item.attachmentUrl.split('/').pop() : null,
        };
    });

    return {
      success: true,
      data: formattedData,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const result = await this.leaveRequestsService.findOne(id);
    return {
      success: true,
      data: result,
    };
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: LeaveRequestStatus; adminId: string; reason?: string },
  ) {
    const result = await this.leaveRequestsService.updateStatus(
      id,
      body.status,
      body.adminId,
      body.reason,
    );
    return {
      success: true,
      data: result,
    };
  }
}
