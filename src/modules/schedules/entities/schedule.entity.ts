import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Class } from '../../classes/entities/class.entity';
import { Subject } from '../../subjects/entities/subject.entity';
import { Teacher } from '../../teachers/entities/teacher.entity';
import { School } from '../../schools/entities/school.entity';
import { AcademicYear } from '../../schools/entities/academic-year.entity';
import { Semester } from '../../academic-records/entities/grade.entity';

export enum DayOfWeek {
  MONDAY = 'monday',
  TUESDAY = 'tuesday',
  WEDNESDAY = 'wednesday',
  THURSDAY = 'thursday',
  FRIDAY = 'friday',
  SATURDAY = 'saturday',
  SUNDAY = 'sunday',
}

export enum ScheduleType {
  REGULAR = 'regular', // Thời khóa biểu thường
  EXAM = 'exam', // Lịch thi
  EVENT = 'event', // Sự kiện đặc biệt
  MAKEUP = 'makeup', // Lịch học bù
}

@Entity('schedules')
@Unique(['classId', 'academicYearId', 'semester', 'dayOfWeek', 'period', 'scheduleType'])
@Index(['classId', 'academicYearId', 'semester'])
@Index(['teacherId', 'dayOfWeek', 'period'])
@Index(['subjectId'])
export class Schedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  classId: string;

  @ManyToOne(() => Class)
  @JoinColumn({ name: 'classId' })
  class: Class;

  @Column()
  schoolId: string;

  @ManyToOne(() => School)
  @JoinColumn({ name: 'schoolId' })
  school: School;

  @Column()
  academicYearId: string;

  @ManyToOne(() => AcademicYear)
  @JoinColumn({ name: 'academicYearId' })
  academicYear: AcademicYear;

  @Column({
    type: 'enum',
    enum: Semester,
    default: Semester.SEMESTER_1,
  })
  semester: Semester;

  @Column({
    type: 'enum',
    enum: DayOfWeek,
  })
  dayOfWeek: DayOfWeek;

  @Column({ type: 'int' })
  period: number; // Tiết thứ mấy (1-10)

  @Column({ type: 'time' })
  startTime: Date; // Giờ bắt đầu

  @Column({ type: 'time' })
  endTime: Date; // Giờ kết thúc

  @Column()
  subjectId: string;

  @ManyToOne(() => Subject)
  @JoinColumn({ name: 'subjectId' })
  subject: Subject;

  @Column({ nullable: true })
  teacherId: string;

  @ManyToOne(() => Teacher, { nullable: true })
  @JoinColumn({ name: 'teacherId' })
  teacher: Teacher;

  @Column({ length: 50, nullable: true })
  room: string; // Phòng học

  @Column({
    type: 'enum',
    enum: ScheduleType,
    default: ScheduleType.REGULAR,
  })
  scheduleType: ScheduleType;

  @Column({ type: 'date', nullable: true })
  effectiveFrom: Date; // Có hiệu lực từ ngày

  @Column({ type: 'date', nullable: true })
  effectiveTo: Date; // Đến ngày

  @Column({ type: 'text', nullable: true })
  note: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  createdBy: string;

  @Column({ nullable: true })
  updatedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
