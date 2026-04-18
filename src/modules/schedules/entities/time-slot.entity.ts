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
import { School } from '../../schools/entities/school.entity';

@Entity('time_slots')
@Index(['schoolId', 'period'])
export class TimeSlot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  schoolId: string;

  @ManyToOne(() => School)
  @JoinColumn({ name: 'schoolId' })
  school: School;

  @Column({ type: 'int' })
  period: number; // Tiết thứ mấy

  @Column({ length: 50 })
  name: string; // Tên tiết: 'Tiết 1', 'Tiết 2', 'Ra chơi'

  @Column({ type: 'time' })
  startTime: Date;

  @Column({ type: 'time' })
  endTime: Date;

  @Column({ type: 'int' })
  duration: number; // Thời lượng (phút)

  @Column({ default: false })
  isBreak: boolean; // Có phải là giờ nghỉ không

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
