import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Parent } from './entities/parent.entity';
import { StudentParentRelation } from './entities/student-parent-relation.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Parent, StudentParentRelation])],
  exports: [TypeOrmModule],
})
export class ParentsModule {}
