import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Class } from './entities/class.entity';
import { School } from '../schools/entities/school.entity';
import { Grade } from '../schools/entities/grade.entity';
import { AcademicYear } from '../schools/entities/academic-year.entity';
import { Teacher } from '../teachers/entities/teacher.entity';
import { ClassesService } from './classes.service';
import { ClassesController } from './classes.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Class, School, Grade, AcademicYear, Teacher]),
    AuthModule,
  ],
  controllers: [ClassesController],
  providers: [ClassesService],
  exports: [TypeOrmModule, ClassesService],
})
export class ClassesModule {}
