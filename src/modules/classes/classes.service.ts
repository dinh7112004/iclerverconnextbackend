import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Class } from './entities/class.entity';
import { School } from '../schools/entities/school.entity';
import { Grade } from '../schools/entities/grade.entity';
import { AcademicYear } from '../schools/entities/academic-year.entity';
import { Teacher } from '../teachers/entities/teacher.entity';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';

@Injectable()
export class ClassesService {
  constructor(
    @InjectRepository(Class)
    private classRepository: Repository<Class>,
    @InjectRepository(School)
    private schoolRepository: Repository<School>,
    @InjectRepository(Grade)
    private gradeRepository: Repository<Grade>,
    @InjectRepository(AcademicYear)
    private academicYearRepository: Repository<AcademicYear>,
    @InjectRepository(Teacher)
    private teacherRepository: Repository<Teacher>,
  ) {}

  async create(createClassDto: CreateClassDto) {
    // Verify school exists
    const school = await this.schoolRepository.findOne({
      where: { id: createClassDto.schoolId },
    });
    if (!school) {
      throw new NotFoundException(
        `School with ID ${createClassDto.schoolId} not found`,
      );
    }

    // Verify grade exists and belongs to the school
    const grade = await this.gradeRepository.findOne({
      where: { id: createClassDto.gradeId },
    });
    if (!grade) {
      throw new NotFoundException(
        `Grade with ID ${createClassDto.gradeId} not found`,
      );
    }
    if (grade.schoolId !== createClassDto.schoolId) {
      throw new BadRequestException('Grade does not belong to this school');
    }

    // Verify academic year exists and belongs to the school
    const academicYear = await this.academicYearRepository.findOne({
      where: { id: createClassDto.academicYearId },
    });
    if (!academicYear) {
      throw new NotFoundException(
        `Academic year with ID ${createClassDto.academicYearId} not found`,
      );
    }
    if (academicYear.schoolId !== createClassDto.schoolId) {
      throw new BadRequestException(
        'Academic year does not belong to this school',
      );
    }

    // Check if class code already exists
    const existingClass = await this.classRepository.findOne({
      where: { code: createClassDto.code },
    });
    if (existingClass) {
      throw new ConflictException('Class code already exists');
    }

    // Check if class name already exists for this school, grade, and academic year
    const duplicateClass = await this.classRepository.findOne({
      where: {
        schoolId: createClassDto.schoolId,
        gradeId: createClassDto.gradeId,
        academicYearId: createClassDto.academicYearId,
        name: createClassDto.name,
      },
    });
    if (duplicateClass) {
      throw new ConflictException(
        'Class name already exists for this grade and academic year',
      );
    }

    // Verify homeroom teacher if provided
    if (createClassDto.homeroomTeacherId) {
      const teacher = await this.teacherRepository.findOne({
        where: { id: createClassDto.homeroomTeacherId },
      });
      if (!teacher) {
        throw new NotFoundException('Homeroom teacher not found');
      }
      if (teacher.schoolId !== createClassDto.schoolId) {
        throw new BadRequestException(
          'Homeroom teacher does not belong to this school',
        );
      }
    }

    const classEntity = this.classRepository.create({
      ...createClassDto,
      maxStudents: createClassDto.maxStudents || 40,
    });

    const savedClass = await this.classRepository.save(classEntity);
    return this.findOne(savedClass.id);
  }

  async findAll(filters?: {
    page?: number;
    limit?: number;
    schoolId?: string;
    gradeId?: string;
    academicYearId?: string;
    search?: string;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.classRepository
      .createQueryBuilder('class')
      .leftJoinAndSelect('class.school', 'school')
      .leftJoinAndSelect('class.grade', 'grade')
      .leftJoinAndSelect('class.academicYear', 'academicYear')
      .leftJoinAndSelect('class.homeroomTeacher', 'homeroomTeacher')
      .leftJoinAndSelect('homeroomTeacher.user', 'teacherUser');

    if (filters?.schoolId) {
      queryBuilder.andWhere('class.schoolId = :schoolId', {
        schoolId: filters.schoolId,
      });
    }

    if (filters?.gradeId) {
      queryBuilder.andWhere('class.gradeId = :gradeId', {
        gradeId: filters.gradeId,
      });
    }

    if (filters?.academicYearId) {
      queryBuilder.andWhere('class.academicYearId = :academicYearId', {
        academicYearId: filters.academicYearId,
      });
    }

    if (filters?.search) {
      queryBuilder.andWhere(
        '(class.name LIKE :search OR class.code LIKE :search OR class.room LIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    const total = await queryBuilder.getCount();
    const classes = await queryBuilder
      .orderBy('grade.gradeLevel', 'ASC')
      .addOrderBy('class.name', 'ASC')
      .skip(skip)
      .take(limit)
      .getMany();

    return {
      data: classes,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const classEntity = await this.classRepository.findOne({
      where: { id },
      relations: [
        'school',
        'grade',
        'academicYear',
        'homeroomTeacher',
        'homeroomTeacher.user',
      ],
    });

    if (!classEntity) {
      throw new NotFoundException(`Class with ID ${id} not found`);
    }

    return classEntity;
  }

  async update(id: string, updateClassDto: UpdateClassDto) {
    const classEntity = await this.findOne(id);

    // Check if new code conflicts with existing class
    if (updateClassDto.code && updateClassDto.code !== classEntity.code) {
      const existingClass = await this.classRepository.findOne({
        where: { code: updateClassDto.code },
      });
      if (existingClass) {
        throw new ConflictException('Class code already exists');
      }
    }

    // Verify homeroom teacher if being updated
    if (updateClassDto.homeroomTeacherId) {
      const teacher = await this.teacherRepository.findOne({
        where: { id: updateClassDto.homeroomTeacherId },
      });
      if (!teacher) {
        throw new NotFoundException('Homeroom teacher not found');
      }
      if (teacher.schoolId !== classEntity.schoolId) {
        throw new BadRequestException(
          'Homeroom teacher does not belong to this school',
        );
      }
    }

    // Verify grade if being updated
    if (updateClassDto.gradeId) {
      const grade = await this.gradeRepository.findOne({
        where: { id: updateClassDto.gradeId },
      });
      if (!grade) {
        throw new NotFoundException('Grade not found');
      }
      if (grade.schoolId !== classEntity.schoolId) {
        throw new BadRequestException('Grade does not belong to this school');
      }
    }

    // Verify academic year if being updated
    if (updateClassDto.academicYearId) {
      const academicYear = await this.academicYearRepository.findOne({
        where: { id: updateClassDto.academicYearId },
      });
      if (!academicYear) {
        throw new NotFoundException('Academic year not found');
      }
      if (academicYear.schoolId !== classEntity.schoolId) {
        throw new BadRequestException(
          'Academic year does not belong to this school',
        );
      }
    }

    Object.assign(classEntity, updateClassDto);
    await this.classRepository.save(classEntity);
    return this.findOne(id);
  }

  async remove(id: string) {
    const classEntity = await this.findOne(id);
    await this.classRepository.remove(classEntity);
    return { message: 'Class deleted successfully' };
  }

  async getClassStudents(classId: string) {
    // This will be implemented when we have the student-class relationship
    // For now, we just verify the class exists
    await this.findOne(classId);
    return { message: 'This endpoint will return students in the class' };
  }
}
