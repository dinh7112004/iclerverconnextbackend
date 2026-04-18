import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { School } from '../../schools/entities/school.entity';
import { Grade } from '../../schools/entities/grade.entity';
import { AcademicYear } from '../../schools/entities/academic-year.entity';
import { Teacher } from '../../teachers/entities/teacher.entity';

@Entity('classes')
@Unique(['schoolId', 'academicYearId', 'name'])
export class Class {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  schoolId: string;

  @ManyToOne(() => School)
  @JoinColumn({ name: 'schoolId' })
  school: School;

  @Column()
  gradeId: string;

  @ManyToOne(() => Grade)
  @JoinColumn({ name: 'gradeId' })
  grade: Grade;

  @Column()
  academicYearId: string;

  @ManyToOne(() => AcademicYear)
  @JoinColumn({ name: 'academicYearId' })
  academicYear: AcademicYear;

  @Column({ length: 50 })
  name: string; // "5A", "5B"

  @Column({ unique: true, length: 50 })
  code: string;

  @Column({ nullable: true })
  homeroomTeacherId: string;

  @ManyToOne(() => Teacher, { nullable: true })
  @JoinColumn({ name: 'homeroomTeacherId' })
  homeroomTeacher: Teacher;

  @Column({ type: 'int', default: 40 })
  maxStudents: number;

  @Column({ length: 50, nullable: true })
  room: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
