import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('surveys')
export class Survey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  expiryDate: string;

  @Column({ default: 0 })
  questions: number;

  @Column({ default: true })
  isNew: boolean;

  @Column({ default: 'active' }) // 'active' | 'completed' | 'expired'
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
