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
import { Subject } from '../../subjects/entities/subject.entity';
import { Class } from '../../classes/entities/class.entity';
import { School } from '../../schools/entities/school.entity';
import { Teacher } from '../../teachers/entities/teacher.entity';
import { AcademicYear } from '../../schools/entities/academic-year.entity';

export enum GradeType {
  ORAL = 'ORAL',
  QUIZ_15 = 'QUIZ_15',
  QUIZ_45 = 'QUIZ_45',
  MIDTERM = 'MIDTERM',
  FINAL = 'FINAL',
  ASSIGNMENT = 'ASSIGNMENT',
  PROJECT = 'PROJECT',
  PRACTICAL = 'PRACTICAL',
}

export enum Semester {
  SEMESTER_1 = 'SEMESTER_1',
  SEMESTER_2 = 'SEMESTER_2',
  SUMMER = 'SUMMER',
}

@Entity('grade_records')
@Unique(['studentId', 'subjectId', 'academicYearId', 'semester', 'gradeType', 'examNumber'])
@Index(['studentId', 'academicYearId', 'semester'])
@Index(['classId', 'subjectId'])
export class Grade {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  studentId: string;

  @ManyToOne(() => Student)
  @JoinColumn({ name: 'studentId' })
  student: Student;

  @Column()
  subjectId: string;

  @ManyToOne(() => Subject)
  @JoinColumn({ name: 'subjectId' })
  subject: Subject;

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
  })
  semester: Semester;

  @Column({
    type: 'enum',
    enum: GradeType,
  })
  gradeType: GradeType;

  @Column({ type: 'int', default: 1 })
  examNumber: number; // Lần thi thứ mấy (cho 1 loại điểm)

  @Column({ type: 'decimal', precision: 4, scale: 2 })
  score: number; // 0-10

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 1 })
  coefficient: number; // Hệ số (1 cho miệng, 1 cho 15p, 2 cho 1 tiết, 3 cho cuối kỳ)

  @Column({ type: 'text', nullable: true })
  comment: string; // Nhận xét của giáo viên

  @Column({ type: 'date' })
  examDate: Date;

  @Column({ nullable: true })
  teacherId: string;

  @ManyToOne(() => Teacher, { nullable: true })
  @JoinColumn({ name: 'teacherId' })
  teacher: Teacher;

  @Column({ nullable: true })
  enteredBy: string;

  @Column({ type: 'timestamp', nullable: true })
  enteredAt: Date;

  @Column({ nullable: true })
  verifiedBy: string; // ID của giáo viên chủ nhiệm xác nhận

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt: Date;

  @Column({ default: false })
  isPublished: boolean; // Đã công bố cho học sinh/phụ huynh chưa

  @Column({ type: 'timestamp', nullable: true })
  publishedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
