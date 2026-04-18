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
import { Student } from '../../students/entities/student.entity';
import { Class } from '../../classes/entities/class.entity';
import { School } from '../../schools/entities/school.entity';

export enum PeriodType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  SEMESTER = 'semester',
  YEARLY = 'yearly',
}

@Entity('attendance_summary')
@Unique(['studentId', 'classId', 'periodType', 'periodStart'])
@Index(['studentId', 'periodType'])
@Index(['classId', 'periodType'])
export class AttendanceSummary {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  studentId: string;

  @ManyToOne(() => Student)
  @JoinColumn({ name: 'studentId' })
  student: Student;

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

  @Column({
    type: 'enum',
    enum: PeriodType,
  })
  periodType: PeriodType;

  @Column({ type: 'date' })
  periodStart: Date;

  @Column({ type: 'date' })
  periodEnd: Date;

  @Column({ type: 'int', default: 0 })
  totalDays: number;

  @Column({ type: 'int', default: 0 })
  presentDays: number;

  @Column({ type: 'int', default: 0 })
  absentDays: number;

  @Column({ type: 'int', default: 0 })
  lateDays: number;

  @Column({ type: 'int', default: 0 })
  excusedDays: number;

  @Column({ type: 'int', default: 0 })
  sickDays: number;

  @Column({ type: 'int', default: 0 })
  permissionDays: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  attendanceRate: number; // Percentage

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
