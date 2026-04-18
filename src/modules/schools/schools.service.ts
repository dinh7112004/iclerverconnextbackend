import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { School } from './entities/school.entity';
import { Grade } from './entities/grade.entity';
import { AcademicYear } from './entities/academic-year.entity';
import { User } from '../users/entities/user.entity';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { CreateGradeDto } from './dto/create-grade.dto';
import { CreateAcademicYearDto } from './dto/create-academic-year.dto';
import { UserRole } from '../../common/enums/role.enum';

@Injectable()
export class SchoolsService {
  constructor(
    @InjectRepository(School)
    private schoolRepository: Repository<School>,
    @InjectRepository(Grade)
    private gradeRepository: Repository<Grade>,
    @InjectRepository(AcademicYear)
    private academicYearRepository: Repository<AcademicYear>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  // School CRUD Operations
  async createSchool(createSchoolDto: CreateSchoolDto) {
    // Check if school code already exists
    const existingSchool = await this.schoolRepository.findOne({
      where: { code: createSchoolDto.code },
    });
    if (existingSchool) {
      throw new ConflictException('School code already exists');
    }

    // Verify principal exists and has correct role
    if (createSchoolDto.principalId) {
      const principal = await this.userRepository.findOne({
        where: { id: createSchoolDto.principalId },
      });
      if (!principal) {
        throw new NotFoundException('Principal not found');
      }
      if (
        principal.role !== UserRole.PRINCIPAL &&
        principal.role !== UserRole.SUPER_ADMIN
      ) {
        throw new BadRequestException('User must have PRINCIPAL role');
      }
    }

    const school = this.schoolRepository.create({
      ...createSchoolDto,
      status: createSchoolDto.status || 'active',
    });

    const savedSchool = await this.schoolRepository.save(school);
    return this.findOneSchool(savedSchool.id);
  }

  async findAllSchools(filters?: {
    page?: number;
    limit?: number;
    schoolType?: string;
    city?: string;
    status?: string;
    search?: string;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.schoolRepository
      .createQueryBuilder('school')
      .leftJoinAndSelect('school.principal', 'principal');

    if (filters?.schoolType) {
      queryBuilder.andWhere('school.schoolType = :schoolType', {
        schoolType: filters.schoolType,
      });
    }

    if (filters?.city) {
      queryBuilder.andWhere('school.city = :city', { city: filters.city });
    }

    if (filters?.status) {
      queryBuilder.andWhere('school.status = :status', {
        status: filters.status,
      });
    }

    if (filters?.search) {
      queryBuilder.andWhere(
        '(school.name LIKE :search OR school.code LIKE :search OR school.address LIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    const total = await queryBuilder.getCount();
    const schools = await queryBuilder
      .orderBy('school.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getMany();

    return {
      data: schools,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOneSchool(id: string) {
    const school = await this.schoolRepository.findOne({
      where: { id },
      relations: ['principal'],
    });

    if (!school) {
      throw new NotFoundException(`School with ID ${id} not found`);
    }

    return school;
  }

  async updateSchool(id: string, updateSchoolDto: UpdateSchoolDto) {
    const school = await this.findOneSchool(id);

    // Check if new code conflicts with existing school
    if (updateSchoolDto.code && updateSchoolDto.code !== school.code) {
      const existingSchool = await this.schoolRepository.findOne({
        where: { code: updateSchoolDto.code },
      });
      if (existingSchool) {
        throw new ConflictException('School code already exists');
      }
    }

    // Verify new principal if provided
    if (updateSchoolDto.principalId) {
      const principal = await this.userRepository.findOne({
        where: { id: updateSchoolDto.principalId },
      });
      if (!principal) {
        throw new NotFoundException('Principal not found');
      }
      if (
        principal.role !== UserRole.PRINCIPAL &&
        principal.role !== UserRole.SUPER_ADMIN
      ) {
        throw new BadRequestException('User must have PRINCIPAL role');
      }
    }

    Object.assign(school, updateSchoolDto);
    await this.schoolRepository.save(school);
    return this.findOneSchool(id);
  }

  async removeSchool(id: string) {
    const school = await this.findOneSchool(id);
    school.status = 'inactive';
    await this.schoolRepository.save(school);
    return { message: 'School deactivated successfully' };
  }

  // Grade CRUD Operations
  async createGrade(createGradeDto: CreateGradeDto) {
    const school = await this.findOneSchool(createGradeDto.schoolId);

    // Check for duplicate grade level in the same school
    const existingGrade = await this.gradeRepository.findOne({
      where: {
        schoolId: createGradeDto.schoolId,
        gradeLevel: createGradeDto.gradeLevel,
      },
    });
    if (existingGrade) {
      throw new ConflictException(
        'Grade level already exists for this school',
      );
    }

    const grade = this.gradeRepository.create(createGradeDto);
    return this.gradeRepository.save(grade);
  }

  async findAllGrades(schoolId?: string) {
    const queryBuilder = this.gradeRepository
      .createQueryBuilder('grade')
      .leftJoinAndSelect('grade.school', 'school')
      .orderBy('grade.gradeLevel', 'ASC');

    if (schoolId) {
      queryBuilder.where('grade.schoolId = :schoolId', { schoolId });
    }

    return queryBuilder.getMany();
  }

  async findOneGrade(id: string) {
    const grade = await this.gradeRepository.findOne({
      where: { id },
      relations: ['school'],
    });

    if (!grade) {
      throw new NotFoundException(`Grade with ID ${id} not found`);
    }

    return grade;
  }

  async updateGrade(
    id: string,
    updateData: Partial<Omit<CreateGradeDto, 'schoolId'>>,
  ) {
    const grade = await this.findOneGrade(id);

    // Check for duplicate if gradeLevel is being updated
    if (updateData.gradeLevel && updateData.gradeLevel !== grade.gradeLevel) {
      const existingGrade = await this.gradeRepository.findOne({
        where: {
          schoolId: grade.schoolId,
          gradeLevel: updateData.gradeLevel,
        },
      });
      if (existingGrade) {
        throw new ConflictException(
          'Grade level already exists for this school',
        );
      }
    }

    Object.assign(grade, updateData);
    return this.gradeRepository.save(grade);
  }

  async removeGrade(id: string) {
    const grade = await this.findOneGrade(id);
    await this.gradeRepository.remove(grade);
    return { message: 'Grade deleted successfully' };
  }

  // Academic Year CRUD Operations
  async createAcademicYear(createAcademicYearDto: CreateAcademicYearDto) {
    const school = await this.findOneSchool(createAcademicYearDto.schoolId);

    // Check for duplicate academic year name in the same school
    const existingYear = await this.academicYearRepository.findOne({
      where: {
        schoolId: createAcademicYearDto.schoolId,
        name: createAcademicYearDto.name,
      },
    });
    if (existingYear) {
      throw new ConflictException(
        'Academic year name already exists for this school',
      );
    }

    // Validate dates
    const startDate = new Date(createAcademicYearDto.startDate);
    const endDate = new Date(createAcademicYearDto.endDate);
    if (startDate >= endDate) {
      throw new BadRequestException('Start date must be before end date');
    }

    // If setting as current, unset other current years for this school
    if (createAcademicYearDto.isCurrent) {
      await this.academicYearRepository.update(
        { schoolId: createAcademicYearDto.schoolId, isCurrent: true },
        { isCurrent: false },
      );
    }

    const academicYear = this.academicYearRepository.create({
      ...createAcademicYearDto,
      startDate,
      endDate,
      isCurrent: createAcademicYearDto.isCurrent || false,
    });

    return this.academicYearRepository.save(academicYear);
  }

  async findAllAcademicYears(schoolId?: string, isCurrent?: boolean) {
    const queryBuilder = this.academicYearRepository
      .createQueryBuilder('academicYear')
      .leftJoinAndSelect('academicYear.school', 'school')
      .orderBy('academicYear.startDate', 'DESC');

    if (schoolId) {
      queryBuilder.where('academicYear.schoolId = :schoolId', { schoolId });
    }

    if (isCurrent !== undefined) {
      queryBuilder.andWhere('academicYear.isCurrent = :isCurrent', {
        isCurrent,
      });
    }

    return queryBuilder.getMany();
  }

  async findOneAcademicYear(id: string) {
    const academicYear = await this.academicYearRepository.findOne({
      where: { id },
      relations: ['school'],
    });

    if (!academicYear) {
      throw new NotFoundException(`Academic year with ID ${id} not found`);
    }

    return academicYear;
  }

  async updateAcademicYear(
    id: string,
    updateData: Partial<Omit<CreateAcademicYearDto, 'schoolId'>>,
  ) {
    const academicYear = await this.findOneAcademicYear(id);

    // Validate dates if being updated
    if (updateData.startDate || updateData.endDate) {
      const startDate = updateData.startDate
        ? new Date(updateData.startDate)
        : academicYear.startDate;
      const endDate = updateData.endDate
        ? new Date(updateData.endDate)
        : academicYear.endDate;

      if (startDate >= endDate) {
        throw new BadRequestException('Start date must be before end date');
      }

      if (updateData.startDate) academicYear.startDate = startDate;
      if (updateData.endDate) academicYear.endDate = endDate;
    }

    // If setting as current, unset other current years for this school
    if (updateData.isCurrent === true) {
      await this.academicYearRepository.update(
        {
          schoolId: academicYear.schoolId,
          isCurrent: true,
        },
        { isCurrent: false },
      );
    }

    Object.assign(academicYear, updateData);
    return this.academicYearRepository.save(academicYear);
  }

  async removeAcademicYear(id: string) {
    const academicYear = await this.findOneAcademicYear(id);
    await this.academicYearRepository.remove(academicYear);
    return { message: 'Academic year deleted successfully' };
  }

  async getCurrentAcademicYear(schoolId: string) {
    const academicYear = await this.academicYearRepository.findOne({
      where: { schoolId, isCurrent: true },
      relations: ['school'],
    });

    if (!academicYear) {
      throw new NotFoundException(
        'No current academic year set for this school',
      );
    }

    return academicYear;
  }
}
