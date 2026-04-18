import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subject } from './entities/subject.entity';

@Injectable()
export class SubjectsService {
  constructor(
    @InjectRepository(Subject)
    private subjectsRepository: Repository<Subject>,
  ) {}

  async findAll(gradeLevel?: number): Promise<Subject[]> {
    if (gradeLevel) {
      return this.subjectsRepository.find({ where: { gradeLevel } });
    }
    return this.subjectsRepository.find();
  }

}
