import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LeaveRequest, LeaveRequestStatus } from './entities/leave-request.entity';

@Injectable()
export class LeaveRequestsService {
  private readonly logger = new Logger(LeaveRequestsService.name);

  constructor(
    @InjectModel(LeaveRequest.name)
    private readonly leaveRequestModel: Model<LeaveRequest>,
  ) {}

  async create(data: Partial<LeaveRequest>): Promise<LeaveRequest> {
    const request = await this.leaveRequestModel.create({
      ...data,
      status: LeaveRequestStatus.PENDING,
    });
    this.logger.log(`Created leave request for student ${data.studentId}`);
    return request;
  }

  async findAll(filters: { studentId?: string; parentId?: string; status?: string }) {
    const query: any = {};
    if (filters.studentId) query.studentId = filters.studentId;
    if (filters.parentId) query.parentId = filters.parentId;
    if (filters.status) query.status = filters.status;

    return this.leaveRequestModel
      .find(query)
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<LeaveRequest> {
    const request = await this.leaveRequestModel.findById(id);
    if (!request) {
      throw new NotFoundException('Không tìm thấy đơn xin nghỉ');
    }
    return request;
  }

  async updateStatus(id: string, status: LeaveRequestStatus, adminId: string, reason?: string): Promise<LeaveRequest> {
    const request = await this.findOne(id);
    request.status = status;
    request.approvedBy = adminId;
    if (reason) request.rejectionReason = reason;
    return request.save();
  }
}
