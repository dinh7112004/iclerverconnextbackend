/**
 * eConnect 5.0 - Menu Entity
 * Daily nutrition/menu entries for schools
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { School } from '../../schools/entities/school.entity';

export enum MealType {
  BREAKFAST = 'BREAKFAST',
  MORNING_SNACK = 'MORNING_SNACK',
  LUNCH = 'LUNCH',
  AFTERNOON_SNACK = 'AFTERNOON_SNACK',
  DINNER = 'DINNER',
}

@Entity('menus')
export class Menu {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'school_id' })
  schoolId: string;

  @ManyToOne(() => School)
  @JoinColumn({ name: 'school_id' })
  school: School;

  @Column({ type: 'date' })
  date: string;

  @Column({
    type: 'enum',
    enum: MealType,
    name: 'meal_type',
  })
  mealType: MealType;

  @Column({ name: 'dish_name' })
  dishName: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'simple-array', nullable: true })
  ingredients: string[];

  @Column({ type: 'int', nullable: true })
  calories: number;

  @Column({ type: 'int', nullable: true })
  protein: number;

  @Column({ type: 'int', nullable: true })
  carbs: number;

  @Column({ type: 'int', nullable: true })
  fat: number;

  @Column({ type: 'simple-array', nullable: true })
  allergens: string[];

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'image_url', nullable: true })
  imageUrl: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
