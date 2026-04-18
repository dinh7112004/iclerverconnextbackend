import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { School } from '../../schools/entities/school.entity';
import { Class } from '../../classes/entities/class.entity';

@Entity('students')
export class Student {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  studentCode: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  schoolId: string;

  @ManyToOne(() => School)
  @JoinColumn({ name: 'schoolId' })
  school: School;

  @Column({ length: 50 })
  firstName: string;

  @Column({ length: 50 })
  lastName: string;

  @Column({ length: 100 })
  fullName: string;

  @Column({ type: 'date' })
  dateOfBirth: Date;

  @Column({ length: 10, nullable: true })
  gender: string;

  @Column({ length: 50, nullable: true })
  ethnicity: string;

  @Column({ length: 50, nullable: true })
  religion: string;

  @Column({ length: 50, default: 'Việt Nam' })
  nationality: string;

  @Column({ length: 100, nullable: true })
  birthplace: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  avatarUrl: string;

  @Column({ nullable: true })
  qrCode: string;

  @Column({ nullable: true })
  qrExpiresAt: Date;

  @Column({ nullable: true })
  currentClassId: string;

  @ManyToOne(() => Class, { nullable: true })
  @JoinColumn({ name: 'currentClassId' })
  currentClass: Class;

  @Column({ type: 'date', nullable: true })
  enrollmentDate: Date;

  @Column({ length: 20, default: 'active' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
