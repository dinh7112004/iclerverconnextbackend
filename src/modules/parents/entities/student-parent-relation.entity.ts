import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Student } from '../../students/entities/student.entity';
import { Parent } from './parent.entity';

@Entity('student_parent_relations')
@Unique(['studentId', 'parentId'])
export class StudentParentRelation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  studentId: string;

  @ManyToOne(() => Student)
  @JoinColumn({ name: 'studentId' })
  student: Student;

  @Column()
  parentId: string;

  @ManyToOne(() => Parent)
  @JoinColumn({ name: 'parentId' })
  parent: Parent;

  @Column({ length: 20 })
  relationship: string; // father, mother, guardian

  @Column({ default: false })
  isPrimary: boolean;

  @Column({ default: false })
  isEmergencyContact: boolean;

  @Column({ default: true })
  canPickup: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
