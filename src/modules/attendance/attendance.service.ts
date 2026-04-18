import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Attendance, AttendanceStatus } from './entities/attendance.entity';
import { AttendanceSummary, PeriodType } from './entities/attendance-summary.entity';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { BulkAttendanceDto } from './dto/bulk-attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Attendance)
    private attendanceRepository: Repository<Attendance>,
    @InjectRepository(AttendanceSummary)
    private summaryRepository: Repository<AttendanceSummary>,
  ) {}

  async create(
    createAttendanceDto: CreateAttendanceDto,
    markedBy: string,
  ): Promise<Attendance> {
    const attendance = this.attendanceRepository.create({
      ...createAttendanceDto,
      markedBy,
      markedAt: new Date(),
    });

    return this.attendanceRepository.save(attendance);
  }

  async bulkCreate(
    bulkAttendanceDto: BulkAttendanceDto,
    markedBy: string,
  ): Promise<{ created: number; updated: number }> {
    const { classId, schoolId, date, session, attendance } = bulkAttendanceDto;
    let created = 0;
    let updated = 0;

    for (const record of attendance) {
      const existing = await this.attendanceRepository.findOne({
        where: {
          studentId: record.studentId,
          classId,
          date: new Date(date),
          session,
        },
      });

      if (existing) {
        await this.attendanceRepository.update(existing.id, {
          status: record.status,
          note: record.note,
          reason: record.reason,
          checkInTime: record.checkInTime ? new Date(record.checkInTime) : undefined,
          checkOutTime: record.checkOutTime ? new Date(record.checkOutTime) : undefined,
          updatedBy: markedBy,
        });
        updated++;
      } else {
        await this.attendanceRepository.save({
          studentId: record.studentId,
          classId,
          schoolId,
          date: new Date(date),
          session,
          status: record.status,
          note: record.note,
          reason: record.reason,
          checkInTime: record.checkInTime ? new Date(record.checkInTime) : undefined,
          checkOutTime: record.checkOutTime ? new Date(record.checkOutTime) : undefined,
          markedBy,
          markedAt: new Date(),
        });
        created++;
      }
    }

    return { created, updated };
  }

  async findAll(filters: {
    studentId?: string;
    classId?: string;
    schoolId?: string;
    subjectId?: string;
    startDate?: string;
    endDate?: string;
    status?: AttendanceStatus;
    page?: number;
    limit?: number;
  }): Promise<{ data: Attendance[]; total: number }> {
    const { page = 1, limit = 50, startDate, endDate, ...rest } = filters;
    const skip = (page - 1) * limit;

    const query = this.attendanceRepository.createQueryBuilder('attendance');

    if (filters.studentId) {
      query.andWhere('attendance.studentId = :studentId', {
        studentId: filters.studentId,
      });
    }

    if (filters.classId) {
      query.andWhere('attendance.classId = :classId', {
        classId: filters.classId,
      });
    }

    if (filters.schoolId) {
      query.andWhere('attendance.schoolId = :schoolId', {
        schoolId: filters.schoolId,
      });
    }

    if (filters.subjectId) {
      query.andWhere('attendance.subjectId = :subjectId', {
        subjectId: filters.subjectId,
      });
    }

    if (filters.status) {
      query.andWhere('attendance.status = :status', { status: filters.status });
    }

    if (startDate && endDate) {
      query.andWhere('attendance.date BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    } else if (startDate) {
      query.andWhere('attendance.date >= :startDate', { startDate });
    } else if (endDate) {
      query.andWhere('attendance.date <= :endDate', { endDate });
    }

    query
      .leftJoinAndSelect('attendance.student', 'student')
      .leftJoinAndSelect('attendance.class', 'class')
      .leftJoinAndSelect('attendance.subject', 'subject')
      .orderBy('attendance.date', 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total] = await query.getManyAndCount();

    return { data, total };
  }

  async findOne(id: string): Promise<Attendance> {
    const attendance = await this.attendanceRepository.findOne({
      where: { id },
      relations: ['student', 'class', 'subject', 'markedByTeacher'],
    });

    if (!attendance) {
      throw new NotFoundException(`Attendance with ID ${id} not found`);
    }

    return attendance;
  }

  async update(
    id: string,
    updateAttendanceDto: UpdateAttendanceDto,
    updatedBy: string,
  ): Promise<Attendance> {
    await this.findOne(id);

    await this.attendanceRepository.update(id, {
      ...updateAttendanceDto,
      updatedBy,
    });

    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const result = await this.attendanceRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`Attendance with ID ${id} not found`);
    }
  }

  async getStudentAttendanceStats(
    studentId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<{
    totalDays: number;
    presentDays: number;
    absentDays: number;
    lateDays: number;
    excusedDays: number;
    attendanceRate: number;
  }> {
    const query = this.attendanceRepository
      .createQueryBuilder('attendance')
      .where('attendance.studentId = :studentId', { studentId });

    if (startDate && endDate) {
      query.andWhere('attendance.date BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    const records = await query.getMany();

    const totalDays = records.length;
    const presentDays = records.filter((r) => r.status === AttendanceStatus.PRESENT).length;
    const absentDays = records.filter((r) => r.status === AttendanceStatus.ABSENT).length;
    const lateDays = records.filter((r) => r.status === AttendanceStatus.LATE).length;
    const excusedDays = records.filter((r) => r.status === AttendanceStatus.EXCUSED).length;

    const attendanceRate = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

    return {
      totalDays,
      presentDays,
      absentDays,
      lateDays,
      excusedDays,
      attendanceRate: Number(attendanceRate.toFixed(2)),
    };
  }

  async getClassAttendanceReport(
    classId: string,
    date: string,
  ): Promise<{
    date: string;
    totalStudents: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    attendanceRate: number;
    students: any[];
  }> {
    const records = await this.attendanceRepository.find({
      where: {
        classId,
        date: new Date(date),
      },
      relations: ['student'],
    });

    const totalStudents = records.length;
    const present = records.filter((r) => r.status === AttendanceStatus.PRESENT).length;
    const absent = records.filter((r) => r.status === AttendanceStatus.ABSENT).length;
    const late = records.filter((r) => r.status === AttendanceStatus.LATE).length;
    const excused = records.filter((r) => r.status === AttendanceStatus.EXCUSED).length;
    const attendanceRate = totalStudents > 0 ? (present / totalStudents) * 100 : 0;

    const students = records.map((r) => ({
      studentId: r.studentId,
      studentName: r.student?.fullName,
      status: r.status,
      checkInTime: r.checkInTime,
      note: r.note,
      reason: r.reason,
    }));

    return {
      date,
      totalStudents,
      present,
      absent,
      late,
      excused,
      attendanceRate: Number(attendanceRate.toFixed(2)),
      students,
    };
  }
}
