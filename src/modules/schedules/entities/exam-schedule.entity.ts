import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Class } from '../../classes/entities/class.entity';
import { Subject } from '../../subjects/entities/subject.entity';
import { Teacher } from '../../teachers/entities/teacher.entity';
import { School } from '../../schools/entities/school.entity';

export enum ExamType {
  MIDTERM = 'midterm', // Thi giữa kỳ
  FINAL = 'final', // Thi cuối kỳ
  QUIZ = 'quiz', // Kiểm tra
  ENTRANCE = 'entrance', // Thi tuyển sinh
  GRADUATION = 'graduation', // Thi tốt nghiệp
}

@Entity('exam_schedules')
@Index(['classId', 'examDate'])
@Index(['subjectId', 'examDate'])
@Index(['supervisorId', 'examDate'])
export class ExamSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  examName: string; // Tên kỳ thi

  @Column({
    type: 'enum',
    enum: ExamType,
  })
  examType: ExamType;

  @Column({ nullable: true })
  classId: string;

  @ManyToOne(() => Class, { nullable: true })
  @JoinColumn({ name: 'classId' })
  class: Class;

  @Column()
  schoolId: string;

  @ManyToOne(() => School)
  @JoinColumn({ name: 'schoolId' })
  school: School;

  @Column()
  subjectId: string;

  @ManyToOne(() => Subject)
  @JoinColumn({ name: 'subjectId' })
  subject: Subject;

  @Column({ type: 'date' })
  examDate: Date;

  @Column({ type: 'time' })
  startTime: Date;

  @Column({ type: 'time' })
  endTime: Date;

  @Column({ type: 'int' })
  duration: number; // Thời lượng (phút)

  @Column({ length: 50 })
  room: string; // Phòng thi

  @Column({ nullable: true })
  supervisorId: string; // Giám thị chính

  @ManyToOne(() => Teacher, { nullable: true })
  @JoinColumn({ name: 'supervisorId' })
  supervisor: Teacher;

  @Column({ type: 'jsonb', nullable: true })
  coSupervisors: string[]; // Giám thị phụ

  @Column({ type: 'int', nullable: true })
  totalStudents: number;

  @Column({ type: 'text', nullable: true })
  examFormat: string; // Hình thức thi (tự luận, trắc nghiệm, vấn đáp)

  @Column({ type: 'text', nullable: true })
  examContent: string; // Nội dung thi

  @Column({ type: 'text', nullable: true })
  requirements: string; // Yêu cầu, đồ dùng được phép mang theo

  @Column({ type: 'text', nullable: true })
  note: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isPublished: boolean; // Đã công bố lịch thi chưa

  @Column({ nullable: true })
  createdBy: string;

  @Column({ nullable: true })
  updatedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
