import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { UserRole } from '../../common/enums/role.enum';
import { UserStatus } from '../../common/enums/status.enum';
import { User } from '../../modules/users/entities/user.entity';
import { School } from '../../modules/schools/entities/school.entity';
import { Grade } from '../../modules/schools/entities/grade.entity';
import { AcademicYear } from '../../modules/schools/entities/academic-year.entity';
import { Subject } from '../../modules/subjects/entities/subject.entity';
import { Teacher } from '../../modules/teachers/entities/teacher.entity';
import { Student } from '../../modules/students/entities/student.entity';
import { Parent } from '../../modules/parents/entities/parent.entity';
import { StudentParentRelation } from '../../modules/parents/entities/student-parent-relation.entity';
import { Class } from '../../modules/classes/entities/class.entity';
import { TimeSlot } from '../../modules/schedules/entities/time-slot.entity';
import { AppDataSource } from '../data-source';

const firstNames = {
  male: ['Minh', 'Tuấn', 'Hùng', 'Dũng', 'Thành', 'Phúc', 'Đức', 'Khôi', 'Hoàng', 'Nam', 'Anh', 'Quân', 'Long', 'Hải', 'Việt'],
  female: ['Hương', 'Lan', 'Mai', 'Hoa', 'Thu', 'Linh', 'Trang', 'Hà', 'Nga', 'Nhung', 'Thảo', 'Uyển', 'Phương', 'Yến', 'Ly'],
};
const middleNames = ['Văn', 'Thị', 'Đình', 'Hoàng', 'Minh', 'Công', 'Thanh', 'Hữu'];
const lastNames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng'];

function randomElement<T>(array: T[]): T { return array[Math.floor(Math.random() * array.length)]; }

function generateVietnameseName(gender: 'male' | 'female', index?: number): any {
  const lastName = lastNames[(index || 0) % lastNames.length];
  const middleName = middleNames[(index || 0) % middleNames.length];
  const pool = firstNames[gender];
  const firstName = pool[(index || 0) % pool.length];
  return { firstName: `${middleName} ${firstName}`, lastName, fullName: `${lastName} ${middleName} ${firstName}` };
}

async function seedCore() {
  console.log('🌱 Seeding Core Data...');
  await AppDataSource.initialize();

  const userRepo = AppDataSource.getRepository(User);
  const schoolRepo = AppDataSource.getRepository(School);
  const gradeRepo = AppDataSource.getRepository(Grade);
  const academicYearRepo = AppDataSource.getRepository(AcademicYear);
  const subjectRepo = AppDataSource.getRepository(Subject);
  const teacherRepo = AppDataSource.getRepository(Teacher);
  const studentRepo = AppDataSource.getRepository(Student);
  const parentRepo = AppDataSource.getRepository(Parent);
  const relationRepo = AppDataSource.getRepository(StudentParentRelation);
  const classRepo = AppDataSource.getRepository(Class);
  const timeSlotRepo = AppDataSource.getRepository(TimeSlot);

  // Clear core tables
  await AppDataSource.query(`TRUNCATE TABLE users, schools, grades, academic_years, subjects, teachers, students, parents, student_parent_relations, classes, time_slots CASCADE;`);

  // 1. School
  const school = await schoolRepo.save({ name: 'Trường THCS Nguyễn Du', code: 'THCS-ND', schoolType: 'middle', status: 'active' });

  // 2. Academic Year
  const academicYear = await academicYearRepo.save({ schoolId: school.id, name: '2024-2025', startDate: new Date('2024-09-05'), endDate: new Date('2025-05-31'), isCurrent: true });

  // 3. Grades & Subjects
  const gradeLevels = [6, 7, 8, 9];
  const subjectTemplates = [
    { name: 'Toán học', code: 'TOAN' }, { name: 'Ngữ văn', code: 'VAN' }, { name: 'Tiếng Anh', code: 'ANH' },
    { name: 'Vật lý', code: 'LY' }, { name: 'Hóa học', code: 'HOA' }, { name: 'Sinh học', code: 'SINH' }
  ];

  for (const level of gradeLevels) {
    const grade = await gradeRepo.save({ schoolId: school.id, name: `Khối ${level}`, gradeLevel: level });
    for (const sub of subjectTemplates) {
      await subjectRepo.save({ schoolId: school.id, ...sub, code: `${sub.code}-${level}`, gradeLevel: level });
    }
  }

  // 4. Admin Users
  const passwordHash = await bcrypt.hash('password123', 12);
  await userRepo.save({ email: 'admin@thcsnguyendu.edu.vn', phone: '0901234567', passwordHash, fullName: 'Nguyễn Văn Admin', role: UserRole.SUPER_ADMIN, status: UserStatus.ACTIVE });

  // 5. Teachers
  for (let i = 1; i <= 10; i++) {
    const { fullName } = generateVietnameseName(i % 2 === 0 ? 'female' : 'male', i);
    const user = await userRepo.save({ email: `giaovien${i}@thcsnguyendu.edu.vn`, phone: `090${i}000000`, passwordHash, fullName, role: UserRole.TEACHER, status: UserStatus.ACTIVE });
    await teacherRepo.save({ teacherCode: `GV${i}`, userId: user.id, schoolId: school.id, fullName, specialization: 'Toán học', status: UserStatus.ACTIVE });
  }

  // 6. Classes & Students
  const grades = await gradeRepo.find();
  const teachers = await teacherRepo.find();
  let studentIdx = 1;

  for (const grade of grades) {
    for (const letter of ['A', 'B']) {
      const className = `${grade.gradeLevel}${letter}`;
      const cls = await classRepo.save({ schoolId: school.id, gradeId: grade.id, academicYearId: academicYear.id, name: className, homeroomTeacherId: teachers[0].id });

      for (let i = 1; i <= 5; i++) {
        const { fullName } = generateVietnameseName(i % 2 === 0 ? 'female' : 'male', studentIdx);
        const sUser = await userRepo.save({ email: `hocsinh${studentIdx}@thcsnguyendu.edu.vn`, phone: `080${studentIdx}000000`, passwordHash, fullName, role: UserRole.STUDENT, status: UserStatus.ACTIVE });
        const student = await studentRepo.save({ studentCode: `HS${studentIdx}`, userId: sUser.id, schoolId: school.id, fullName, currentClassId: cls.id, status: UserStatus.ACTIVE });

        // Parent
        const pEmail = `phuhuynh${studentIdx}@thcsnguyendu.edu.vn`;
        const pUser = await userRepo.save({ email: pEmail, phone: `070${studentIdx}000000`, passwordHash, fullName: `Phụ huynh ${fullName}`, role: UserRole.PARENT, status: UserStatus.ACTIVE });
        const parent = await parentRepo.save({ userId: pUser.id, fullName: `Phụ huynh ${fullName}`, relationship: 'Cha' });
        await relationRepo.save({ studentId: student.id, parentId: parent.id, relationship: 'Cha', isPrimary: true });

        studentIdx++;
      }
    }
  }

  console.log('✅ Core seeding completed.');
  await AppDataSource.destroy();
}

seedCore().catch(e => console.error(e));
