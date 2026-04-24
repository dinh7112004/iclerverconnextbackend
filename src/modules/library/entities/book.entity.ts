import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('books')
export class Book {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column()
  author: string;

  @Column({ nullable: true })
  imageUrl: string;

  @Column()
  category: string;

  @Column({ default: 'Có sẵn' })
  availability: string; // 'Có sẵn' | 'Đã hết'

  @Column({ default: 'Sẵn sàng' })
  status: string; // 'Sẵn sàng' | 'Đang mượn'

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: 0 })
  pages: number;

  @Column({ type: 'float', default: 5.0 })
  rating: number;

  @Column({ nullable: true })
  year: string;

  @Column({ nullable: true })
  returnDate: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
