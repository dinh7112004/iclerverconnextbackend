import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Report, ReportType, ReportStatus, ReportSchedule } from './entities/report.entity';
import { CreateReportDto } from './dto/create-report.dto';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectModel(Report.name)
    private reportModel: Model<Report>,
  ) {}

  async create(userId: string, dto: CreateReportDto): Promise<Report> {
    const report = await this.reportModel.create({
      ...dto,
      generatedBy: userId,
      status: ReportStatus.PENDING,
      nextRunAt: dto.isScheduled ? this.calculateNextRun(dto.schedule) : undefined,
    });

    this.logger.log(`Created report ${report._id} of type ${dto.type}`);

    // Start processing report asynchronously
    this.processReport(report._id.toString()).catch((error) => {
      this.logger.error(`Error processing report: ${error.message}`, error.stack);
    });

    return report;
  }

  async findAll(
    userId: string,
    options: {
      type?: ReportType;
      status?: ReportStatus;
      limit?: number;
      skip?: number;
    } = {},
  ) {
    const query: any = { generatedBy: userId };
    if (options.type) query.type = options.type;
    if (options.status) query.status = options.status;

    const [data, total] = await Promise.all([
      this.reportModel
        .find(query)
        .sort({ createdAt: -1 })
        .limit(options.limit || 50)
        .skip(options.skip || 0)
        .exec(),
      this.reportModel.countDocuments(query),
    ]);

    return { data, total };
  }

  async findById(id: string): Promise<Report> {
    const report = await this.reportModel.findById(id);
    if (!report) {
      throw new NotFoundException('Báo cáo không tồn tại');
    }
    return report;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await this.reportModel.deleteOne({ _id: id, generatedBy: userId });
    return result.deletedCount > 0;
  }

  async getStatistics(userId: string) {
    const stats = await this.reportModel.aggregate([
      { $match: { generatedBy: userId } },
      {
        $group: {
          _id: {
            type: '$type',
            status: '$status',
          },
          count: { $sum: 1 },
        },
      },
    ]);

    const total = await this.reportModel.countDocuments({ generatedBy: userId });

    return {
      total,
      byType: stats.reduce((acc, stat) => {
        if (!acc[stat._id.type]) {
          acc[stat._id.type] = { total: 0, completed: 0, failed: 0, pending: 0 };
        }
        acc[stat._id.type].total += stat.count;
        acc[stat._id.type][stat._id.status] = stat.count;
        return acc;
      }, {}),
    };
  }

  // ==================== REPORT PROCESSING ====================

  private async processReport(reportId: string): Promise<void> {
    try {
      const report = await this.reportModel.findById(reportId);
      if (!report) {
        throw new Error('Report not found');
      }

      // Update status to processing
      report.status = ReportStatus.PROCESSING;
      report.startedAt = new Date();
      await report.save();

      this.logger.log(`Processing report ${reportId} of type ${report.type}`);

      // Generate report data based on type
      let data: any;
      switch (report.type) {
        case ReportType.ATTENDANCE:
          data = await this.generateAttendanceReport(report);
          break;
        case ReportType.GRADES:
          data = await this.generateGradesReport(report);
          break;
        case ReportType.STUDENT_PERFORMANCE:
          data = await this.generateStudentPerformanceReport(report);
          break;
        case ReportType.CLASS_SUMMARY:
          data = await this.generateClassSummaryReport(report);
          break;
        case ReportType.TEACHER_PERFORMANCE:
          data = await this.generateTeacherPerformanceReport(report);
          break;
        case ReportType.FINANCIAL:
          data = await this.generateFinancialReport(report);
          break;
        case ReportType.AI_USAGE:
          data = await this.generateAIUsageReport(report);
          break;
        default:
          throw new Error(`Unsupported report type: ${report.type}`);
      }

      // Generate file (PDF, Excel, etc.)
      const fileUrl = await this.generateReportFile(report, data);

      // Update report with results
      report.data = data;
      report.fileUrl = fileUrl;
      report.status = ReportStatus.COMPLETED;
      report.completedAt = new Date();
      await report.save();

      this.logger.log(`Completed report ${reportId}`);

      // Send email if configured
      if (report.sendEmail && report.recipients.length > 0) {
        await this.sendReportEmail(report);
      }

      // Update next run time if scheduled
      if (report.isScheduled) {
        report.nextRunAt = this.calculateNextRun(report.schedule);
        await report.save();
      }
    } catch (error) {
      this.logger.error(
        `Failed to process report ${reportId}: ${error.message}`,
        error.stack,
      );

      await this.reportModel.findByIdAndUpdate(reportId, {
        status: ReportStatus.FAILED,
        errorMessage: error.message,
        completedAt: new Date(),
      });
    }
  }

  // ==================== REPORT GENERATORS ====================

  private async generateAttendanceReport(report: Report): Promise<any> {
    // TODO: Query attendance data based on filters
    this.logger.log('Generating attendance report');

    return {
      summary: {
        totalDays: 30,
        totalStudents: 100,
        averageAttendanceRate: 95.5,
      },
      byClass: [
        {
          className: 'Lớp 10A1',
          students: 35,
          presentDays: 28,
          absentDays: 2,
          attendanceRate: 93.3,
        },
      ],
      byStudent: [
        {
          studentName: 'Nguyễn Văn A',
          presentDays: 29,
          absentDays: 1,
          lateDays: 0,
          attendanceRate: 96.7,
        },
      ],
    };
  }

  private async generateGradesReport(report: Report): Promise<any> {
    // TODO: Query grades data
    this.logger.log('Generating grades report');

    return {
      summary: {
        totalStudents: 100,
        averageScore: 7.5,
        excellentStudents: 20,
        goodStudents: 45,
        averageStudents: 30,
        weakStudents: 5,
      },
      bySubject: [
        {
          subject: 'Toán',
          averageScore: 7.8,
          highestScore: 10,
          lowestScore: 5.5,
        },
      ],
      byClass: [
        {
          className: 'Lớp 10A1',
          averageScore: 7.9,
          topStudent: 'Nguyễn Văn A',
          topScore: 9.5,
        },
      ],
    };
  }

  private async generateStudentPerformanceReport(report: Report): Promise<any> {
    // TODO: Query student performance data
    this.logger.log('Generating student performance report');

    return {
      student: {
        name: 'Nguyễn Văn A',
        class: 'Lớp 10A1',
      },
      academicPerformance: {
        gpa: 8.5,
        rank: 3,
        totalStudents: 35,
      },
      subjectScores: [
        {
          subject: 'Toán',
          score: 9.0,
          rank: 2,
          trend: 'up',
        },
      ],
      attendance: {
        presentDays: 29,
        absentDays: 1,
        rate: 96.7,
      },
      behavior: {
        rating: 'Tốt',
        violations: 0,
        achievements: 2,
      },
    };
  }

  private async generateClassSummaryReport(report: Report): Promise<any> {
    // TODO: Query class data
    this.logger.log('Generating class summary report');

    return {
      class: {
        name: 'Lớp 10A1',
        totalStudents: 35,
        teacher: 'Nguyễn Thị B',
      },
      academicPerformance: {
        averageGPA: 7.5,
        excellentStudents: 8,
        goodStudents: 18,
        averageStudents: 7,
        weakStudents: 2,
      },
      attendance: {
        averageRate: 95.5,
        bestStudent: 'Nguyễn Văn A',
        worstStudent: 'Trần Văn C',
      },
      subjects: [
        {
          subject: 'Toán',
          averageScore: 7.8,
          teacher: 'Lê Văn D',
        },
      ],
    };
  }

  private async generateTeacherPerformanceReport(report: Report): Promise<any> {
    // TODO: Query teacher data
    this.logger.log('Generating teacher performance report');

    return {
      teacher: {
        name: 'Nguyễn Thị B',
        subject: 'Toán',
      },
      classes: [
        {
          className: 'Lớp 10A1',
          students: 35,
          averageScore: 7.8,
        },
      ],
      studentPerformance: {
        totalStudents: 105,
        averageScore: 7.6,
        passRate: 95.2,
      },
      activities: {
        lessonsPlanned: 120,
        lessonsDelivered: 118,
        assignmentsGiven: 24,
        examsGiven: 4,
      },
    };
  }

  private async generateFinancialReport(report: Report): Promise<any> {
    // TODO: Query financial data
    this.logger.log('Generating financial report');

    return {
      summary: {
        totalRevenue: 500000000,
        totalExpenses: 350000000,
        netProfit: 150000000,
      },
      tuitionFees: {
        collected: 450000000,
        pending: 50000000,
        overdue: 10000000,
      },
      expenses: [
        {
          category: 'Lương giáo viên',
          amount: 250000000,
        },
      ],
      byClass: [
        {
          className: 'Lớp 10A1',
          totalFees: 15000000,
          collected: 14000000,
          pending: 1000000,
        },
      ],
    };
  }

  private async generateAIUsageReport(report: Report): Promise<any> {
    // TODO: Query AI usage data
    this.logger.log('Generating AI usage report');

    return {
      summary: {
        totalConversations: 1500,
        totalMessages: 15000,
        totalTokens: 5000000,
        totalCost: 75.5,
      },
      byProvider: [
        {
          provider: 'OpenAI GPT-4',
          requests: 800,
          tokens: 3000000,
          cost: 60.0,
        },
      ],
      byUser: [
        {
          userName: 'Nguyễn Văn A',
          conversations: 50,
          messages: 500,
          tokens: 150000,
        },
      ],
      topIntents: [
        {
          intent: 'get_scores',
          count: 450,
        },
      ],
    };
  }

  // ==================== HELPER METHODS ====================

  private async generateReportFile(report: Report, data: any): Promise<string> {
    // TODO: Implement actual file generation using libraries
    // For PDF: use PDFKit or similar
    // For Excel: use xlsx
    this.logger.log(`Generating ${report.format} file for report ${report._id}`);

    // Mock file URL
    return `/reports/${report._id}.${report.format}`;
  }

  private async sendReportEmail(report: Report): Promise<void> {
    // TODO: Implement email sending
    this.logger.log(`Sending report ${report._id} to ${report.recipients.join(', ')}`);
  }

  private calculateNextRun(schedule?: ReportSchedule): Date {
    const now = new Date();
    const next = new Date(now);

    switch (schedule) {
      case ReportSchedule.DAILY:
        next.setDate(next.getDate() + 1);
        break;
      case ReportSchedule.WEEKLY:
        next.setDate(next.getDate() + 7);
        break;
      case ReportSchedule.MONTHLY:
        next.setMonth(next.getMonth() + 1);
        break;
      case ReportSchedule.QUARTERLY:
        next.setMonth(next.getMonth() + 3);
        break;
      case ReportSchedule.YEARLY:
        next.setFullYear(next.getFullYear() + 1);
        break;
      default:
        return next;
    }

    // Set time to 00:00:00
    next.setHours(0, 0, 0, 0);
    return next;
  }

  // ==================== SCHEDULED JOBS ====================

  @Cron(CronExpression.EVERY_HOUR)
  async runScheduledReports() {
    const now = new Date();
    const reports = await this.reportModel.find({
      isScheduled: true,
      status: { $in: [ReportStatus.COMPLETED, ReportStatus.FAILED] },
      nextRunAt: { $lte: now },
    });

    this.logger.log(`Found ${reports.length} scheduled reports to run`);

    for (const report of reports) {
      // Create a new report instance for this run
      const newReport = await this.reportModel.create({
        name: `${report.name} (Auto)`,
        description: report.description,
        type: report.type,
        format: report.format,
        filters: report.filters,
        config: report.config,
        generatedBy: report.generatedBy,
        isScheduled: false,
        sendEmail: report.sendEmail,
        recipients: report.recipients,
      });

      // Process the new report
      this.processReport(newReport._id.toString()).catch((error) => {
        this.logger.error(
          `Error processing scheduled report: ${error.message}`,
          error.stack,
        );
      });

      // Update next run time for the original scheduled report
      report.nextRunAt = this.calculateNextRun(report.schedule);
      await report.save();
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupOldReports() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await this.reportModel.deleteMany({
      isScheduled: false,
      createdAt: { $lt: thirtyDaysAgo },
    });

    this.logger.log(`Cleaned up ${result.deletedCount} old reports`);
  }
}
