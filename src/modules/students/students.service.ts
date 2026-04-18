  BadRequestException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Repository } from 'typeorm';
import { Student } from './entities/student.entity';
import { StudentHealthInfo } from './entities/student-health-info.entity';
import { User } from '../users/entities/user.entity';
import { Parent } from '../parents/entities/parent.entity';
import { StudentParentRelation } from '../parents/entities/student-parent-relation.entity';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { UserRole } from '../../common/enums/role.enum';
import { UserStatus } from '../../common/enums/status.enum';

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(StudentHealthInfo)
    private healthInfoRepository: Repository<StudentHealthInfo>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Parent)
    private parentRepository: Repository<Parent>,
    @InjectRepository(StudentParentRelation)
    private relationRepository: Repository<StudentParentRelation>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async create(createStudentDto: CreateStudentDto) {
    // Generate student code
    const studentCode = await this.generateStudentCode(createStudentDto.schoolId);

    // Create user account for student
    const fullName = `${createStudentDto.lastName} ${createStudentDto.firstName}`.trim();
    const email = createStudentDto.email || `${studentCode}@student.sll.vn`;

    const user = this.userRepository.create({
      email,
      phone: createStudentDto.phone,
      fullName,
      role: UserRole.STUDENT,
      status: UserStatus.ACTIVE,
      emailVerified: false,
    });

    const savedUser = await this.userRepository.save(user);

    // Create student record
    const student = this.studentRepository.create({
      ...createStudentDto,
      userId: savedUser.id,
      studentCode,
      fullName,
    });

    const savedStudent = await this.studentRepository.save(student);

    // Create health info if provided
    if (createStudentDto.healthInfo) {
      const healthInfo = this.healthInfoRepository.create({
        studentId: savedStudent.id,
        ...createStudentDto.healthInfo,
      });
      await this.healthInfoRepository.save(healthInfo);
    }

    // Create parent relations if provided
    if (createStudentDto.father || createStudentDto.mother || createStudentDto.guardian) {
      await this.createParentRelations(savedStudent.id, createStudentDto);
    }

    return this.findOne(savedStudent.id);
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    classId?: string;
    schoolId?: string;
    status?: string;
    search?: string;
  }) {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100);
    const skip = (page - 1) * limit;

    const queryBuilder = this.studentRepository
      .createQueryBuilder('student')
      .leftJoinAndSelect('student.user', 'user')
      .leftJoinAndSelect('student.currentClass', 'class')
      .leftJoinAndSelect('student.school', 'school');

    if (query.classId) {
      queryBuilder.andWhere('student.currentClassId = :classId', {
        classId: query.classId,
      });
    }

    if (query.schoolId) {
      queryBuilder.andWhere('student.schoolId = :schoolId', {
        schoolId: query.schoolId,
      });
    }

    if (query.status) {
      queryBuilder.andWhere('student.status = :status', { status: query.status });
    }

    if (query.search) {
      queryBuilder.andWhere(
        '(student.fullName ILIKE :search OR student.studentCode ILIKE :search OR student.email ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    const [items, total] = await queryBuilder
      .orderBy('student.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      items,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  async findOne(id: string) {
    const student = await this.studentRepository.findOne({
      where: { id },
      relations: [
        'user',
        'currentClass',
        'currentClass.homeroomTeacher',
        'currentClass.grade',
        'school',
      ],

    });

    if (!student) {
      throw new NotFoundException(`Student with ID ${id} not found`);
    }

    // Get health info
    const healthInfo = await this.healthInfoRepository.findOne({
      where: { studentId: id },
    });

    // Get parent relations
    const parentRelations = await this.relationRepository.find({
      where: { studentId: id },
      relations: ['parent', 'parent.user'],
    });

    return {
      ...student,
      healthInfo,
      parents: parentRelations.map((rel) => ({
        ...rel.parent,
        relationship: rel.relationship,
        isPrimary: rel.isPrimary,
        isEmergencyContact: rel.isEmergencyContact,
      })),
    };
  }

  async findByUserId(userId: string) {
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    const cacheKey = `student_profile_user_${userId}`;

    try {
      // Try to get from cache first
      const cachedProfile = await this.cacheManager.get(cacheKey);
      if (cachedProfile) {
        console.log(`[StudentsService] Returning CACHED profile for User ${userId}`);
        return cachedProfile;
      }

      console.log(`[StudentsService] Fetching profile for User ${userId} (Cache MISS)`);
      
      // 1. Check if the user is a student directly
      let student = await this.studentRepository.findOne({
        where: { userId },
        relations: [
          'user',
          'currentClass',
          'currentClass.homeroomTeacher',
          'currentClass.grade',
          'school',
        ],
      });

      // 2. If not found, check if the user is a parent
      if (!student) {
        console.log(`[StudentsService] User ${userId} is not a student, checking if parent...`);
        const parent = await this.parentRepository.findOne({
          where: { userId },
        });

        if (parent) {
          console.log(`[StudentsService] User ${userId} is Parent ${parent.id}. Finding children...`);
          const relation = await this.relationRepository.findOne({
            where: { parentId: parent.id },
            order: { isPrimary: 'DESC' },
          });

          if (relation) {
            console.log(`[StudentsService] Parent ${parent.id} linked to Student ${relation.studentId}`);
            student = await this.studentRepository.findOne({
              where: { id: relation.studentId },
              relations: [
                'user',
                'currentClass',
                'currentClass.homeroomTeacher',
                'currentClass.grade',
                'school',
              ],
            });
          }
        }
      }

      if (!student) {
        console.warn(`[StudentsService] No student profile found for User ${userId}`);
        throw new NotFoundException(`No student profile found for this account`);
      }

      // Get health info safely
      let healthInfo = null;
      try {
        healthInfo = await this.healthInfoRepository.findOne({
          where: { studentId: student.id },
        });
      } catch (healthErr) {
        console.error(`[StudentsService] Error fetching health info for student ${student.id}:`, healthErr.message);
      }

      const result = {
        ...student,
        healthInfo,
      };

      // Save to cache
      await this.cacheManager.set(cacheKey, result, 600000); // 10 minutes

      return result;
    } catch (error) {
      console.error(`[StudentsService] Fatal error in findByUserId for ${userId}:`, error.stack);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Unable to retrieve profile: ${error.message}`);
    }
  }

  async update(id: string, updateStudentDto: UpdateStudentDto) {
    const student = await this.studentRepository.findOne({ where: { id } });

    if (!student) {
      throw new NotFoundException(`Student with ID ${id} not found`);
    }

    // Update student record
    Object.assign(student, updateStudentDto);

    if (updateStudentDto.firstName || updateStudentDto.lastName) {
      student.fullName = `${updateStudentDto.lastName || student.lastName} ${updateStudentDto.firstName || student.firstName}`.trim();
    }

    await this.studentRepository.save(student);

    // Update health info if provided
    if (updateStudentDto.healthInfo) {
      let healthInfo = await this.healthInfoRepository.findOne({
        where: { studentId: id },
      });

      if (healthInfo) {
        Object.assign(healthInfo, updateStudentDto.healthInfo);
        await this.healthInfoRepository.save(healthInfo);
      } else {
        healthInfo = this.healthInfoRepository.create({
          studentId: id,
          ...updateStudentDto.healthInfo,
        });
        await this.healthInfoRepository.save(healthInfo);
      }
    }

    return this.findOne(id);
  }

  async remove(id: string) {
    const student = await this.studentRepository.findOne({
      where: { id },
    });

    if (!student) {
      throw new NotFoundException(`Student with ID ${id} not found`);
    }

    // Soft delete
    student.status = 'deleted';
    await this.studentRepository.save(student);

    return { message: 'Student deleted successfully' };
  }

  private async generateStudentCode(schoolId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.studentRepository.count({
      where: { schoolId },
    });

    return `${year}${String(count + 1).padStart(4, '0')}`;
  }

  private async createParentRelations(
    studentId: string,
    createStudentDto: CreateStudentDto,
  ) {
    const parentData = [
      { data: createStudentDto.father, relationship: 'father' },
      { data: createStudentDto.mother, relationship: 'mother' },
      { data: createStudentDto.guardian, relationship: 'guardian' },
    ];

    for (const { data, relationship} of parentData) {
      if (!data) continue;

      // Create user account for parent
      const parentUser = this.userRepository.create({
        email: data.email || `${relationship}_${studentId}@parent.sll.vn`,
        phone: data.phone,
        fullName: data.name,
        role: UserRole.PARENT,
        status: UserStatus.ACTIVE,
      });

      const savedUser = await this.userRepository.save(parentUser);

      // Create parent record
      const parent = this.parentRepository.create({
        userId: savedUser.id,
        fullName: data.name,
        firstName: data.name.split(' ')[0],
        lastName: data.name.split(' ').slice(1).join(' '),
        relationship,
        phone: data.phone,
        email: data.email,
        occupation: data.occupation,
        workplace: data.workplace,
      });

      const savedParent = await this.parentRepository.save(parent);

      // Create relation
      const relation = this.relationRepository.create({
        studentId,
        parentId: savedParent.id,
        relationship,
        isPrimary: relationship === 'father',
        isEmergencyContact: relationship === 'father',
      });

      await this.relationRepository.save(relation);
    }
  }
}
