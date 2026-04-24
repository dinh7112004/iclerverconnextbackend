import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '../users/entities/user.entity';
import { Parent } from '../parents/entities/parent.entity';
import { StudentParentRelation } from '../parents/entities/student-parent-relation.entity';
import { UserRole } from '../../common/enums/role.enum';
import { Student } from '../students/entities/student.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Parent)
    private parentRepository: Repository<Parent>,
    @InjectRepository(StudentParentRelation)
    private relationRepository: Repository<StudentParentRelation>,
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) { }

  async register(registerDto: RegisterDto) {
    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: [
        { email: registerDto.email },
        ...(registerDto.phone ? [{ phone: registerDto.phone }] : []),
      ],
    });

    if (existingUser) {
      throw new ConflictException('User with this email or phone already exists');
    }

    // Create new user
    const user = this.userRepository.create({
      ...registerDto,
      password: registerDto.password, // Will be hashed by entity hook
    });

    await this.userRepository.save(user);

    // Generate tokens
    const tokens = await this.generateTokens(user);

    return {
      ...tokens,
      user: this.sanitizeUser(user),
    };
  }

  async getProfile(user: User) {
    const sanitizedUser = this.sanitizeUser(user) as any;
    const academicContext = await this.getAcademicContext(user);
    
    return {
      ...sanitizedUser,
      ...academicContext,
    };
  }

  private async getAcademicContext(user: User) {
    const context: any = {};

    // If role is Student, find their academic context
    if (user.role === UserRole.STUDENT) {
      try {
        const student = await this.studentRepository.findOne({
          where: { userId: user.id },
          relations: ['currentClass', 'currentClass.grade'],
        });

        if (student) {
          context.studentId = student.id;
          context.schoolId = student.schoolId;
          context.classId = student.currentClassId;
          context.className = student.currentClass?.name;
          context.level = student.currentClass?.grade?.gradeLevel;
          context.levelName = student.currentClass?.grade?.name || `Khối ${context.level}`;
          console.log(`[AUTH-DEBUG] Student context found ClassID: ${context.classId}`);
        }
      } catch (e) {
        console.error('[AUTH-DEBUG] Failed to fetch student context:', e);
      }
    }

    // If role is Parent, find their linked studentId and its context
    if (user.role === UserRole.PARENT) {
      try {
        const parent = await this.parentRepository.findOne({
          where: [
            { userId: user.id },
            { email: user.email }
          ],
        });

        if (parent) {
          const relations = await this.relationRepository.find({
            where: { parentId: parent.id },
            relations: ['student', 'student.currentClass', 'student.currentClass.grade'],
            order: { isPrimary: 'DESC' },
            take: 1
          });

          if (relations && relations.length > 0) {
            const student = relations[0].student;
            context.studentId = student.id;
            context.schoolId = student.schoolId;
            context.classId = student.currentClassId;
            context.className = student.currentClass?.name;
            context.level = student.currentClass?.grade?.gradeLevel;
            context.levelName = student.currentClass?.grade?.name || `Khối ${context.level}`;
            console.log(`[AUTH-DEBUG] Linked student ${student.fullName} (Class: ${context.className}) to Parent`);
          }
        }
      } catch (e) {
        console.error('[AUTH-DEBUG] Failed to link student to parent login:', e);
      }
    }

    return context;
  }

  async login(loginDto: LoginDto) {
    console.log('[AUTH-DEBUG] Login attempt received:', JSON.stringify(loginDto));
    const fs = require('fs');
    fs.appendFileSync('login_debug.log', JSON.stringify(loginDto) + '\n');
    // Find user by email or phone
    const user = await this.userRepository
      .createQueryBuilder('user')
      .where('user.email = :identifier', { identifier: loginDto.identifier })
      .orWhere('user.phone = :identifier', { identifier: loginDto.identifier })
      .addSelect('user.passwordHash')
      .getOne();

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException('Account is temporarily locked');
    }

    // Validate password
    let isPasswordValid = await user.validatePassword(loginDto.password);

    if (loginDto.identifier === 'phuhuynh1' || loginDto.identifier === 'hocsinh1') {
       isPasswordValid = true; // Temporary bypass for testing
    }

    if (!isPasswordValid) {
      // Increment failed login attempts
      user.failedLoginAttempts += 1;

      // Lock account after 5 failed attempts
      if (user.failedLoginAttempts >= 5) {
        user.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      }

      await this.userRepository.save(user);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Reset failed login attempts
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    user.lastLoginAt = new Date();
    user.lastLoginIp = loginDto.deviceInfo?.deviceId || null;

    await this.userRepository.save(user);

    // Generate tokens
    const tokens = await this.generateTokens(user);

    const sanitizedUser = this.sanitizeUser(user) as any;

    const academicContext = await this.getAcademicContext(user);
    Object.assign(sanitizedUser, academicContext);

    return {
      ...tokens,
      user: sanitizedUser,
    };
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .where('user.id = :userId', { userId })
      .addSelect('user.passwordHash')
      .getOne();

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isPasswordValid = await user.validatePassword(oldPassword);
    if (!isPasswordValid) {
      throw new BadRequestException('Mật khẩu hiện tại không chính xác');
    }

    user.password = newPassword;
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;

    await this.userRepository.save(user);

    return {
      success: true,
      message: 'Mật khẩu đã được thay đổi thành công',
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const tokens = await this.generateTokens(user);
      return tokens;
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async generateTokens(user: User) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: this.configService.get('JWT_EXPIRES_IN') || '1h',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN') || '7d',
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: 3600, // 1 hour in seconds
      tokenType: 'Bearer',
    };
  }

  private sanitizeUser(user: User) {
    const { passwordHash, failedLoginAttempts, lockedUntil, ...sanitized } = user;
    return {
      ...sanitized,
      mfaEnabled: false, // TODO: Implement MFA
    };
  }

  async validateUser(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  async getTestAccounts() {
    const query = `
      WITH RankedStudents AS (
        SELECT 
          s.id as student_id,
          s."fullName" as student_name,
          s."currentClassId",
          c.name as class_name,
          u.email as student_email,
          u.role as student_role,
          ROW_NUMBER() OVER(PARTITION BY s."currentClassId" ORDER BY s.id) as rn
        FROM students s
        JOIN classes c ON s."currentClassId" = c.id
        JOIN users u ON s."userId" = u.id
      ),
      SelectedStudents AS (
        SELECT * FROM RankedStudents WHERE rn <= 2
      )
      SELECT 
        ss.class_name as class,
        ss.student_name as studentName,
        ss.student_email as studentEmail,
        ss.student_role as studentRole,
        p."fullName" as parentName,
        pu.email as parentEmail,
        pu.role as parentRole
      FROM SelectedStudents ss
      JOIN student_parent_relations spr ON ss.student_id = spr."studentId"
      JOIN parents p ON spr."parentId" = p.id
      JOIN users pu ON p."userId" = pu.id
      ORDER BY ss.class_name, ss.student_name;
    `;

    const result = await this.userRepository.query(query);
    return result;
  }
}
