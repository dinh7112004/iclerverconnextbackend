import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Teacher } from './entities/teacher.entity';
import { User } from '../users/entities/user.entity';
import { School } from '../schools/entities/school.entity';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { UserRole } from '../../common/enums/role.enum';
import { UserStatus } from '../../common/enums/status.enum';
import { Class } from '../classes/entities/class.entity';
import { Schedule } from '../schedules/entities/schedule.entity';

@Injectable()
export class TeachersService {
  constructor(
    @InjectRepository(Teacher)
    private teacherRepository: Repository<Teacher>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(School)
    private schoolRepository: Repository<School>,
    @InjectRepository(Class)
    private classRepository: Repository<Class>,
    @InjectRepository(Schedule)
    private scheduleRepository: Repository<Schedule>,
  ) {}

  async create(createTeacherDto: CreateTeacherDto) {
    // Verify school exists
    const school = await this.schoolRepository.findOne({
      where: { id: createTeacherDto.schoolId },
    });
    if (!school) {
      throw new NotFoundException(
        `School with ID ${createTeacherDto.schoolId} not found`,
      );
    }

    // Check if email or phone already exists
    if (createTeacherDto.email) {
      const existingEmailUser = await this.userRepository.findOne({
        where: { email: createTeacherDto.email },
      });
      if (existingEmailUser) {
        throw new ConflictException('Email already exists');
      }
    }

    if (createTeacherDto.phone) {
      const existingPhoneUser = await this.userRepository.findOne({
        where: { phone: createTeacherDto.phone },
      });
      if (existingPhoneUser) {
        throw new ConflictException('Phone number already exists');
      }
    }

    // Generate teacher code
    const teacherCode = await this.generateTeacherCode(
      createTeacherDto.schoolId,
    );

    // Create user account for teacher
    const fullName =
      `${createTeacherDto.lastName} ${createTeacherDto.firstName}`.trim();
    const user = this.userRepository.create({
      email:
        createTeacherDto.email ||
        `${teacherCode.toLowerCase()}@teacher.sll.vn`,
      phone: createTeacherDto.phone,
      fullName,
      role: UserRole.TEACHER,
      status: UserStatus.ACTIVE,
    });

    const savedUser = await this.userRepository.save(user);

    // Create teacher record
    const teacher = this.teacherRepository.create({
      ...createTeacherDto,
      userId: savedUser.id,
      teacherCode,
      fullName,
      dateOfBirth: createTeacherDto.dateOfBirth
        ? new Date(createTeacherDto.dateOfBirth)
        : null,
      hireDate: createTeacherDto.hireDate
        ? new Date(createTeacherDto.hireDate)
        : new Date(),
      status: createTeacherDto.status || 'active',
    });

    const savedTeacher = await this.teacherRepository.save(teacher);

    return this.findOne(savedTeacher.id);
  }

  async findAll(filters?: {
    page?: number;
    limit?: number;
    schoolId?: string;
    status?: string;
    specialization?: string;
    classId?: string;
    search?: string;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.teacherRepository
      .createQueryBuilder('teacher')
      .leftJoinAndSelect('teacher.user', 'user')
      .leftJoinAndSelect('teacher.school', 'school');

    // Apply filters
    if (filters?.schoolId) {
      queryBuilder.andWhere('teacher.schoolId = :schoolId', {
        schoolId: filters.schoolId,
      });
    }

    if (filters?.status) {
      queryBuilder.andWhere('teacher.status = :status', {
        status: filters.status,
      });
    }

    if (filters?.specialization) {
      queryBuilder.andWhere('teacher.specialization LIKE :specialization', {
        specialization: `%${filters.specialization}%`,
      });
    }

    let homeroomTeacherId: string = null;
    if (filters?.classId) {
      // Find homeroom teacher id
      const classEntity = await this.classRepository.findOne({
        where: { id: filters.classId },
      });
      if (classEntity) {
        homeroomTeacherId = classEntity.homeroomTeacherId;
      }

      // Find all teacher IDs from schedules plus homeroom
      const schedules = await this.scheduleRepository.find({
        where: { classId: filters.classId, isActive: true },
        select: ['teacherId'],
      });

      const teacherIds = [...new Set(schedules.map((s) => s.teacherId))].filter(
        Boolean,
      );

      if (homeroomTeacherId) {
        if (!teacherIds.includes(homeroomTeacherId)) {
          teacherIds.push(homeroomTeacherId);
        }
      }

      if (teacherIds.length > 0) {
        queryBuilder.andWhere('teacher.id IN (:...teacherIds)', { teacherIds });
      } else if (homeroomTeacherId) {
        queryBuilder.andWhere('teacher.id = :homeroomTeacherId', {
          homeroomTeacherId,
        });
      } else {
        // No teachers found for this class
        return {
          data: [],
          meta: { total: 0, page, limit, totalPages: 0 },
        };
      }
    }

    if (filters?.search) {
      queryBuilder.andWhere(
        '(teacher.fullName LIKE :search OR teacher.teacherCode LIKE :search OR teacher.email LIKE :search OR teacher.phone LIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    const teachers = await queryBuilder
      .orderBy('teacher.fullName', 'ASC')
      .skip(skip)
      .take(limit)
      .getMany();

    // Map to include isHomeroomTeacher flag
    const data = teachers.map((teacher) => ({
      ...teacher,
      isHomeroomTeacher: teacher.id === homeroomTeacherId,
    }));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const teacher = await this.teacherRepository.findOne({
      where: { id },
      relations: ['user', 'school'],
    });

    if (!teacher) {
      throw new NotFoundException(`Teacher with ID ${id} not found`);
    }

    return teacher;
  }

  async findByUserId(userId: string) {
    const teacher = await this.teacherRepository.findOne({
      where: { userId },
      relations: ['user', 'school'],
    });

    if (!teacher) {
      throw new NotFoundException(`Teacher with user ID ${userId} not found`);
    }

    return teacher;
  }

  async update(id: string, updateTeacherDto: UpdateTeacherDto) {
    const teacher = await this.findOne(id);

    // Check if email is being updated and if it conflicts
    if (updateTeacherDto.email && updateTeacherDto.email !== teacher.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateTeacherDto.email },
      });
      if (existingUser && existingUser.id !== teacher.userId) {
        throw new ConflictException('Email already exists');
      }
    }

    // Check if phone is being updated and if it conflicts
    if (updateTeacherDto.phone && updateTeacherDto.phone !== teacher.phone) {
      const existingUser = await this.userRepository.findOne({
        where: { phone: updateTeacherDto.phone },
      });
      if (existingUser && existingUser.id !== teacher.userId) {
        throw new ConflictException('Phone number already exists');
      }
    }

    // Update teacher record
    Object.assign(teacher, {
      ...updateTeacherDto,
      dateOfBirth: updateTeacherDto.dateOfBirth
        ? new Date(updateTeacherDto.dateOfBirth)
        : teacher.dateOfBirth,
      hireDate: updateTeacherDto.hireDate
        ? new Date(updateTeacherDto.hireDate)
        : teacher.hireDate,
    });

    // Update full name if first or last name changed
    if (updateTeacherDto.firstName || updateTeacherDto.lastName) {
      teacher.fullName =
        `${updateTeacherDto.lastName || teacher.lastName} ${updateTeacherDto.firstName || teacher.firstName}`.trim();
    }

    await this.teacherRepository.save(teacher);

    // Update user record
    const user = await this.userRepository.findOne({
      where: { id: teacher.userId },
    });
    if (user) {
      if (updateTeacherDto.email) user.email = updateTeacherDto.email;
      if (updateTeacherDto.phone) user.phone = updateTeacherDto.phone;
      if (teacher.fullName) user.fullName = teacher.fullName;
      await this.userRepository.save(user);
    }

    return this.findOne(id);
  }

  async remove(id: string) {
    const teacher = await this.findOne(id);

    // Soft delete by updating status
    teacher.status = 'terminated';
    await this.teacherRepository.save(teacher);

    // Also update user status
    const user = await this.userRepository.findOne({
      where: { id: teacher.userId },
    });
    if (user) {
      user.status = UserStatus.INACTIVE;
      await this.userRepository.save(user);
    }

    return { message: 'Teacher deleted successfully' };
  }

  private async generateTeacherCode(schoolId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.teacherRepository.count({
      where: { schoolId },
    });
    const code = `GV${year}${String(count + 1).padStart(4, '0')}`;
    return code;
  }
}
