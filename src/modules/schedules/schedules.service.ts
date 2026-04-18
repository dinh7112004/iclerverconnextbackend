import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Schedule, DayOfWeek, ScheduleType } from './entities/schedule.entity';
import { Semester } from '../academic-records/entities/grade.entity';
import { ExamSchedule, ExamType } from './entities/exam-schedule.entity';
import { TimeSlot } from './entities/time-slot.entity';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { CreateExamScheduleDto } from './dto/create-exam-schedule.dto';
import { BulkScheduleDto } from './dto/bulk-schedule.dto';

@Injectable()
export class SchedulesService {
  constructor(
    @InjectRepository(Schedule)
    private scheduleRepository: Repository<Schedule>,
    @InjectRepository(ExamSchedule)
    private examScheduleRepository: Repository<ExamSchedule>,
    @InjectRepository(TimeSlot)
    private timeSlotRepository: Repository<TimeSlot>,
  ) {}

  // ==================== SCHEDULES ====================

  async createSchedule(
    createScheduleDto: CreateScheduleDto,
    createdBy: string,
  ): Promise<Schedule> {
    const schedule = this.scheduleRepository.create({
      ...createScheduleDto,
      createdBy,
    });

    return this.scheduleRepository.save(schedule);
  }

  async bulkCreateSchedules(
    bulkScheduleDto: BulkScheduleDto,
    createdBy: string,
  ): Promise<{ created: number; updated: number }> {
    let created = 0;
    let updated = 0;

    for (const scheduleDto of bulkScheduleDto.schedules) {
      const existing = await this.scheduleRepository.findOne({
        where: {
          classId: scheduleDto.classId,
          academicYearId: scheduleDto.academicYearId,
          semester: scheduleDto.semester,
          dayOfWeek: scheduleDto.dayOfWeek,
          period: scheduleDto.period,
          scheduleType: scheduleDto.scheduleType || ScheduleType.REGULAR,
        },
      });

      if (existing) {
        await this.scheduleRepository.update(existing.id, {
          ...scheduleDto,
          updatedBy: createdBy,
        });
        updated++;
      } else {
        await this.scheduleRepository.save({
          ...scheduleDto,
          createdBy,
        });
        created++;
      }
    }

    return { created, updated };
  }

  async findAllSchedules(filters: {
    classId?: string;
    teacherId?: string;
    subjectId?: string;
    academicYearId?: string;
    semester?: Semester;
    dayOfWeek?: DayOfWeek;
    scheduleType?: ScheduleType;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ data: Schedule[]; total: number }> {
    const { page = 1, limit = 100, ...rest } = filters;
    const skip = (page - 1) * limit;

    const query = this.scheduleRepository.createQueryBuilder('schedule');

    if (filters.classId) {
      query.andWhere('schedule.classId = :classId', { classId: filters.classId });
    }

    if (filters.teacherId) {
      query.andWhere('schedule.teacherId = :teacherId', {
        teacherId: filters.teacherId,
      });
    }

    if (filters.subjectId) {
      query.andWhere('schedule.subjectId = :subjectId', {
        subjectId: filters.subjectId,
      });
    }

    if (filters.academicYearId) {
      query.andWhere('schedule.academicYearId = :academicYearId', {
        academicYearId: filters.academicYearId,
      });
    }

    if (filters.semester) {
      query.andWhere('schedule.semester = :semester', {
        semester: filters.semester,
      });
    }

    if (filters.dayOfWeek) {
      query.andWhere('schedule.dayOfWeek = :dayOfWeek', {
        dayOfWeek: filters.dayOfWeek,
      });
    }

    if (filters.scheduleType) {
      query.andWhere('schedule.scheduleType = :scheduleType', {
        scheduleType: filters.scheduleType,
      });
    }

    if (filters.isActive !== undefined) {
      query.andWhere('schedule.isActive = :isActive', {
        isActive: filters.isActive,
      });
    }

    query
      .leftJoinAndSelect('schedule.class', 'class')
      .leftJoinAndSelect('schedule.subject', 'subject')
      .leftJoinAndSelect('schedule.teacher', 'teacher')
      .orderBy('schedule.dayOfWeek', 'ASC')
      .addOrderBy('schedule.period', 'ASC')
      .skip(skip)
      .take(limit);

    const [data, total] = await query.getManyAndCount();

    return { data, total };
  }

  async findOneSchedule(id: string): Promise<Schedule> {
    const schedule = await this.scheduleRepository.findOne({
      where: { id },
      relations: ['class', 'subject', 'teacher', 'school', 'academicYear'],
    });

    if (!schedule) {
      throw new NotFoundException(`Schedule with ID ${id} not found`);
    }

    return schedule;
  }

  async updateSchedule(
    id: string,
    updateScheduleDto: UpdateScheduleDto,
    updatedBy: string,
  ): Promise<Schedule> {
    await this.findOneSchedule(id);

    await this.scheduleRepository.update(id, {
      ...updateScheduleDto,
      updatedBy,
    });

    return this.findOneSchedule(id);
  }

  async removeSchedule(id: string): Promise<void> {
    const result = await this.scheduleRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`Schedule with ID ${id} not found`);
    }
  }

  async getClassTimetable(
    classId: string,
    academicYearId: string,
    semester: Semester,
  ): Promise<{
    class: string;
    academicYear: string;
    semester: string;
    timetable: any;
  }> {
    const schedules = await this.scheduleRepository.find({
      where: {
        classId,
        academicYearId,
        semester,
        isActive: true,
      },
      relations: ['subject', 'teacher'],
      order: {
        dayOfWeek: 'ASC',
        period: 'ASC',
      },
    });

    // Group by day of week
    const timetable = {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: [],
    };

    schedules.forEach((schedule) => {
      timetable[schedule.dayOfWeek].push({
        period: schedule.period,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        subjectId: schedule.subjectId,
        subjectName: schedule.subject?.name,
        teacherId: schedule.teacherId,
        teacherName: schedule.teacher?.fullName,
        room: schedule.room,
      });
    });

    return {
      class: classId,
      academicYear: academicYearId,
      semester,
      timetable,
    };
  }

  async getTeacherSchedule(
    teacherId: string,
    academicYearId: string,
    semester: Semester,
  ): Promise<{
    teacher: string;
    academicYear: string;
    semester: string;
    schedules: any[];
  }> {
    const schedules = await this.scheduleRepository.find({
      where: {
        teacherId,
        academicYearId,
        semester,
        isActive: true,
      },
      relations: ['class', 'subject'],
      order: {
        dayOfWeek: 'ASC',
        period: 'ASC',
      },
    });

    const formattedSchedules = schedules.map((schedule) => ({
      dayOfWeek: schedule.dayOfWeek,
      period: schedule.period,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      subjectId: schedule.subjectId,
      subjectName: schedule.subject?.name,
      classId: schedule.classId,
      className: schedule.class?.name,
      room: schedule.room,
    }));

    return {
      teacher: teacherId,
      academicYear: academicYearId,
      semester,
      schedules: formattedSchedules,
    };
  }

  // ==================== EXAM SCHEDULES ====================

  async createExamSchedule(
    createExamScheduleDto: CreateExamScheduleDto,
    createdBy: string,
  ): Promise<ExamSchedule> {
    const examSchedule = this.examScheduleRepository.create({
      ...createExamScheduleDto,
      createdBy,
    });

    return this.examScheduleRepository.save(examSchedule);
  }

  async findAllExamSchedules(filters: {
    classId?: string;
    schoolId?: string;
    subjectId?: string;
    examType?: ExamType;
    startDate?: string;
    endDate?: string;
    isPublished?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ data: ExamSchedule[]; total: number }> {
    const { page = 1, limit = 50, startDate, endDate, ...rest } = filters;
    const skip = (page - 1) * limit;

    const query = this.examScheduleRepository.createQueryBuilder('exam');

    if (filters.classId) {
      query.andWhere('exam.classId = :classId', { classId: filters.classId });
    }

    if (filters.schoolId) {
      query.andWhere('exam.schoolId = :schoolId', { schoolId: filters.schoolId });
    }

    if (filters.subjectId) {
      query.andWhere('exam.subjectId = :subjectId', {
        subjectId: filters.subjectId,
      });
    }

    if (filters.examType) {
      query.andWhere('exam.examType = :examType', { examType: filters.examType });
    }

    if (filters.isPublished !== undefined) {
      query.andWhere('exam.isPublished = :isPublished', {
        isPublished: filters.isPublished,
      });
    }

    if (startDate && endDate) {
      query.andWhere('exam.examDate BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }

    query
      .leftJoinAndSelect('exam.class', 'class')
      .leftJoinAndSelect('exam.subject', 'subject')
      .leftJoinAndSelect('exam.supervisor', 'supervisor')
      .orderBy('exam.examDate', 'ASC')
      .addOrderBy('exam.startTime', 'ASC')
      .skip(skip)
      .take(limit);

    const [data, total] = await query.getManyAndCount();

    return { data, total };
  }

  async findOneExamSchedule(id: string): Promise<ExamSchedule> {
    const examSchedule = await this.examScheduleRepository.findOne({
      where: { id },
      relations: ['class', 'subject', 'supervisor', 'school'],
    });

    if (!examSchedule) {
      throw new NotFoundException(`Exam schedule with ID ${id} not found`);
    }

    return examSchedule;
  }

  async updateExamSchedule(
    id: string,
    updateExamScheduleDto: any,
    updatedBy: string,
  ): Promise<ExamSchedule> {
    await this.findOneExamSchedule(id);

    await this.examScheduleRepository.update(id, {
      ...updateExamScheduleDto,
      updatedBy,
    });

    return this.findOneExamSchedule(id);
  }

  async removeExamSchedule(id: string): Promise<void> {
    const result = await this.examScheduleRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException(`Exam schedule with ID ${id} not found`);
    }
  }

  async publishExamSchedule(id: string): Promise<ExamSchedule> {
    await this.examScheduleRepository.update(id, {
      isPublished: true,
    });

    return this.findOneExamSchedule(id);
  }

  // ==================== TIME SLOTS ====================

  async getTimeSlots(schoolId: string): Promise<TimeSlot[]> {
    return this.timeSlotRepository.find({
      where: { schoolId, isActive: true },
      order: { period: 'ASC' },
    });
  }

  async createTimeSlot(timeSlot: Partial<TimeSlot>): Promise<TimeSlot> {
    return this.timeSlotRepository.save(timeSlot);
  }
}
