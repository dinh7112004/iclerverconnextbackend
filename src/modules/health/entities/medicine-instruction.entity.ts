import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Student } from '../../students/entities/student.entity';

@Entity('medicine_instructions')
export class MedicineInstruction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  studentId: string;

  @ManyToOne(() => Student)
  @JoinColumn({ name: 'studentId' })
  student: Student;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 50 })
  dosage: string;

  @Column({ length: 50 })
  time: string;

  @Column({ type: 'text', nullable: true })
  note: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ default: 'Chờ uống' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
