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
import { AcademicYear } from '../../schools/entities/academic-year.entity';
import { Semester } from './grade.entity';

export enum AcademicRank {
  EXCELLENT = 'excellent', // Giỏi
  GOOD = 'good', // Khá
  AVERAGE = 'average', // Trung bình
  BELOW_AVERAGE = 'below_average', // Yếu
}

export enum Conduct {
  EXCELLENT = 'excellent', // Tốt
  GOOD = 'good', // Khá
  AVERAGE = 'average', // Trung bình
  POOR = 'poor', // Yếu
}

@Entity('academic_summaries')
@Unique(['studentId', 'academicYearId', 'semester'])
@Index(['studentId', 'academicYearId'])
@Index(['classId', 'academicYearId', 'semester'])
export class AcademicSummary {
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

  @Column({ type: 'decimal', precision: 4, scale: 2, nullable: true })
  gpa: number; // Điểm trung bình chung (GPA)

  @Column({
    type: 'enum',
    enum: AcademicRank,
    nullable: true,
  })
  academicRank: AcademicRank;

  @Column({
    type: 'enum',
    enum: Conduct,
    nullable: true,
  })
  conduct: Conduct;

  @Column({ type: 'int', nullable: true })
  totalDaysAttended: number;

  @Column({ type: 'int', nullable: true })
  totalDaysAbsent: number;

  @Column({ type: 'int', nullable: true })
  totalDaysLate: number;

  @Column({ type: 'text', nullable: true })
  teacherComment: string; // Nhận xét của giáo viên chủ nhiệm

  @Column({ type: 'text', nullable: true })
  principalComment: string; // Nhận xét của hiệu trưởng

  @Column({ type: 'jsonb', nullable: true })
  subjectGrades: Array<{
    subjectId: string;
    subjectName: string;
    averageScore: number;
    semesterScore: number;
  }>;

  @Column({ default: false })
  isPromoted: boolean; // Được lên lớp không

  @Column({ type: 'text', nullable: true })
  promotionNote: string;

  @Column({ type: 'int', nullable: true })
  classRank: number; // Xếp hạng trong lớp

  @Column({ type: 'int', nullable: true })
  gradeRank: number; // Xếp hạng trong khối

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
