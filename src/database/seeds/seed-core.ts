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

async function seedCore() {
  console.log('🌱 Seeding Core Data with CORRECT credentials (phuhuynh1, phuhuynh2...)...');
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

  // TRUNCATE ALL TABLES FOR A FRESH START
  console.log('🗑️  Truncating core tables...');
  await AppDataSource.query(`TRUNCATE TABLE users, schools, grades, academic_years, subjects, teachers, students, parents, student_parent_relations, classes, time_slots CASCADE;`);

  const passwordHash = await bcrypt.hash('password123', 12);

  // 1. School
  const school = await schoolRepo.save({ name: 'Trường THCS Nguyễn Du', code: 'THCS-ND', schoolType: 'middle', status: 'active' });
  
  // 2. Academic Year
  const academicYear = await academicYearRepo.save({ schoolId: school.id, name: '2024-2025', startDate: new Date('2024-09-05'), endDate: new Date('2025-05-31'), isCurrent: true });

  // 3. Grades & Subjects
  const gradeLevels = [6, 7, 8, 9];
  const subjectsData = ['Toán học', 'Ngữ văn', 'Tiếng Anh', 'Vật lý', 'Hóa học', 'Sinh học'];
  const gradeMap = new Map<number, any>();

  for (const level of gradeLevels) {
    const grade = await gradeRepo.save({ schoolId: school.id, name: `Khối ${level}`, gradeLevel: level });
    gradeMap.set(level, grade);
    for (const subName of subjectsData) {
      await subjectRepo.save({ schoolId: school.id, name: subName, code: `${subName.toUpperCase()}-${level}`, gradeLevel: level });
    }
  }

  // 4. Teachers
  const teacherNames = ['Nguyễn Văn A', 'Trần Thị B', 'Lê Văn C', 'Phạm Thị D', 'Hoàng Văn E'];
  for (let i = 1; i <= 5; i++) {
    const name = teacherNames[i-1];
    const user = await userRepo.save({ email: `giaovien${i}`, phone: `090${i}000000`, passwordHash, fullName: name, role: UserRole.TEACHER, status: UserStatus.ACTIVE });
    await teacherRepo.save({ 
      teacherCode: `GV${i}`, userId: user.id, schoolId: school.id, 
      firstName: name.split(' ').slice(-1)[0], lastName: name.split(' ')[0], fullName: name,
      gender: i % 2 === 0 ? 'Nữ' : 'Nam', dateOfBirth: new Date('1985-01-01'), specialization: 'Toán học', status: UserStatus.ACTIVE 
    });
  }
  const teachers = await teacherRepo.find();

  // 5. Classes & Students (4 grades * 2 classes * 5 students = 40 students)
  let studentCount = 1;
  for (const level of gradeLevels) {
    const grade = gradeMap.get(level);
    for (const letter of ['A', 'B']) {
      const className = `${level}${letter}`;
      const cls = await classRepo.save({ 
        schoolId: school.id, gradeId: grade.id, academicYearId: academicYear.id, 
        name: className, code: `CLASS-${className}`, homeroomTeacherId: teachers[0].id 
      });
      
      for (let i = 1; i <= 5; i++) {
        const sName = `Học sinh ${studentCount}`;
        const sUser = await userRepo.save({ email: `hocsinh${studentCount}`, phone: `080${studentCount}000000`, passwordHash, fullName: sName, role: UserRole.STUDENT, status: UserStatus.ACTIVE });
        const student = await studentRepo.save({ 
          studentCode: `HS${studentCount}`, userId: sUser.id, schoolId: school.id, 
          firstName: `Học sinh`, lastName: `${studentCount}`, fullName: sName,
          gender: i % 2 === 0 ? 'Nữ' : 'Nam', dateOfBirth: new Date('2012-01-01'), currentClassId: cls.id, status: UserStatus.ACTIVE 
        });

        // Parent
        const pName = `Phụ huynh ${studentCount}`;
        const pUser = await userRepo.save({ email: `phuhuynh${studentCount}`, phone: `070${studentCount}000000`, passwordHash, fullName: pName, role: UserRole.PARENT, status: UserStatus.ACTIVE });
        const parent = await parentRepo.save({ 
          userId: pUser.id, firstName: `Phụ huynh`, lastName: `${studentCount}`, fullName: pName, relationship: 'Cha' 
        });
        await relationRepo.save({ studentId: student.id, parentId: parent.id, relationship: 'Cha', isPrimary: true });
        
        studentCount++;
      }
    }
  }

  // 6. Time Slots
  const slots = [
    { period: 1, name: 'Tiết 1', startTime: '07:00', endTime: '07:45' },
    { period: 2, name: 'Tiết 2', startTime: '07:50', endTime: '08:35' },
    { period: 3, name: 'Tiết 3', startTime: '08:40', endTime: '09:25' },
    { period: 4, name: 'Tiết 4', startTime: '09:45', endTime: '10:30' },
  ];
  for (const s of slots) {
    await timeSlotRepo.save({ schoolId: school.id, ...s, duration: 45, isActive: true });
  }

  console.log('✅ Core seeding completed with credentials like phuhuynh1, hocsinh1...');
  await AppDataSource.destroy();
}

seedCore().catch(console.error);
