import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Student } from './student.entity';

@Entity('student_health_info')
export class StudentHealthInfo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  studentId: string;

  @OneToOne(() => Student)
  @JoinColumn({ name: 'studentId' })
  student: Student;

  @Column({ length: 5, nullable: true })
  bloodType: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  height: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  weight: number;

  @Column({ type: 'text', array: true, default: '{}' })
  allergies: string[];

  @Column({ type: 'text', array: true, default: '{}' })
  chronicDiseases: string[];

  @Column({ type: 'text', nullable: true })
  medicalHistory: string;

  @Column({ type: 'text', nullable: true })
  medications: string;

  @Column({ length: 20, nullable: true })
  emergencyContact: string;

  @Column({ length: 20, nullable: true })
  vision: string;

  @Column({ length: 50, nullable: true })
  insuranceId: string;

  @Column({ type: 'text', nullable: true })
  importantNote: string;

  @Column({ length: 100, nullable: true })
  lastCheckup: string;

  @Column({ type: 'text', nullable: true })
  doctorNotes: string;

  @UpdateDateColumn()
  updatedAt: Date;
}
