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
import { Teacher } from '../../teachers/entities/teacher.entity';
import { Subject } from '../../subjects/entities/subject.entity';

export enum AttendanceStatus {
  PRESENT = 'present',
  ABSENT = 'absent',
  LATE = 'late',
  EXCUSED = 'excused',
  SICK = 'sick',
  PERMISSION = 'permission',
}

@Entity('attendance')
@Unique(['studentId', 'date', 'session'])
@Index(['classId', 'date'])
@Index(['studentId', 'date'])
@Index(['markedBy', 'date'])
export class Attendance {
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

  @Column({ nullable: true })
  subjectId: string;

  @ManyToOne(() => Subject, { nullable: true })
  @JoinColumn({ name: 'subjectId' })
  subject: Subject;

  @Column({ type: 'date' })
  date: Date;

  @Column({ length: 20, default: 'all_day' })
  session: string; // 'morning', 'afternoon', 'all_day', 'period_1', 'period_2', etc.

  @Column({ length: 10, nullable: true })
  period: string; // Tiết học: '1', '2', '3'...

  @Column({
    type: 'enum',
    enum: AttendanceStatus,
    default: AttendanceStatus.PRESENT,
  })
  status: AttendanceStatus;

  @Column({ type: 'time', nullable: true })
  checkInTime: Date;

  @Column({ type: 'time', nullable: true })
  checkOutTime: Date;

  @Column({ type: 'text', nullable: true })
  note: string;

  @Column({ type: 'text', nullable: true })
  reason: string; // Lý do vắng mặt

  @Column({ default: false })
  hasExcuseNote: boolean; // Có giấy phép không

  @Column({ type: 'text', nullable: true })
  excuseNoteUrl: string; // Link đến file giấy phép

  @Column({ nullable: true })
  markedBy: string;

  @ManyToOne(() => Teacher, { nullable: true })
  @JoinColumn({ name: 'markedBy' })
  markedByTeacher: Teacher;

  @Column({ type: 'timestamp', nullable: true })
  markedAt: Date;

  @Column({ nullable: true })
  updatedBy: string;

  @Column({ nullable: true })
  parentNotified: boolean;

  @Column({ type: 'timestamp', nullable: true })
  parentNotifiedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
