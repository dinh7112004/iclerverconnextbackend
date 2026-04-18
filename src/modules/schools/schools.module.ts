import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { School } from './entities/school.entity';
import { AcademicYear } from './entities/academic-year.entity';
import { Grade } from './entities/grade.entity';
import { User } from '../users/entities/user.entity';
import { SchoolsService } from './schools.service';
import { SchoolsController } from './schools.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([School, AcademicYear, Grade, User]),
    AuthModule,
  ],
  controllers: [SchoolsController],
  providers: [SchoolsService],
  exports: [TypeOrmModule, SchoolsService],
})
export class SchoolsModule {}
