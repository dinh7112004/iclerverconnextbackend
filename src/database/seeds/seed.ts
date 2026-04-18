import 'dotenv/config';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserRole } from '../../common/enums/role.enum';
import { UserStatus, AttendanceStatus } from '../../common/enums/status.enum';
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
import { Schedule, DayOfWeek } from '../../modules/schedules/entities/schedule.entity';
import { Attendance } from '../../modules/attendance/entities/attendance.entity';
import { Grade as GradeRecord, GradeType, Semester } from '../../modules/academic-records/entities/grade.entity';

// Vietnamese name data
const firstNames = {
  male: [
    'Minh', 'Tuấn', 'Hùng', 'Dũng', 'Thành', 'Phúc', 'Đức', 'Khôi', 'Hoàng', 'Nam',
    'Anh', 'Quân', 'Long', 'Hải', 'Việt', 'Tâm', 'Bảo', 'Đạt', 'Phong', 'Trung',
    'Khánh', 'Huy', 'Tài', 'An', 'Kiên', 'Sơn', 'Toàn', 'Thiện', 'Quang', 'Cường',
  ],
  female: [
    'Hương', 'Lan', 'Mai', 'Hoa', 'Thu', 'Linh', 'Trang', 'Hà', 'Nga', 'Nhung',
    'Thảo', 'Uyển', 'Phương', 'Yến', 'Ly', 'My', 'Ngọc', 'Anh', 'Chi', 'Hằng',
    'Duyên', 'Quỳnh', 'Thanh', 'Tú', 'Vân', 'Xuân', 'Diệp', 'Trâm', 'Như', 'Kim',
  ],
};

const middleNames = ['Văn', 'Thị', 'Đình', 'Hoàng', 'Minh', 'Công', 'Thanh', 'Hữu', 'Gia', 'Bảo'];

const lastNames = [
  'Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng',
  'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý', 'Đào', 'Đinh', 'Mai', 'Trương',
];

const streets = [
  'Lê Lợi', 'Trần Hưng Đạo', 'Nguyễn Huệ', 'Hai Bà Trưng', 'Lý Thường Kiệt',
  'Hoàng Diệu', 'Phan Đình Phùng', 'Quang Trung', 'Lê Duẩn', 'Trường Chinh',
];

const districts = [
  'Quận 1', 'Quận 2', 'Quận 3', 'Quận 4', 'Quận 5', 'Quận 6', 'Quận 7',
  'Quận 8', 'Quận 9', 'Quận 10', 'Quận 11', 'Quận 12', 'Quận Bình Thạnh',
  'Quận Phú Nhuận', 'Quận Tân Bình', 'Quận Gò Vấp',
];

const occupations = [
  'Kỹ sư', 'Bác sĩ', 'Giáo viên', 'Kinh doanh', 'Công nhân', 'Nhân viên văn phòng',
  'Luật sư', 'Kế toán', 'Nội trợ', 'Dược sĩ', 'Kiến trúc sư', 'Lập trình viên',
];

// Subject data for Vietnamese middle school
const subjects = [
  { name: 'Toán học', code: 'TOAN', color: '#3B82F6', icon: 'calculator' },
  { name: 'Ngữ văn', code: 'VAN', color: '#EF4444', icon: 'book' },
  { name: 'Tiếng Anh', code: 'ANH', color: '#10B981', icon: 'language' },
  { name: 'Vật lý', code: 'LY', color: '#8B5CF6', icon: 'atom' },
  { name: 'Hóa học', code: 'HOA', color: '#F59E0B', icon: 'flask' },
  { name: 'Sinh học', code: 'SINH', color: '#14B8A6', icon: 'leaf' },
  { name: 'Lịch sử', code: 'SU', color: '#EC4899', icon: 'history' },
  { name: 'Địa lý', code: 'DIA', color: '#06B6D4', icon: 'globe' },
  { name: 'GDCD', code: 'GDCD', color: '#84CC16', icon: 'gavel' },
  { name: 'Tin học', code: 'TIN', color: '#6366F1', icon: 'computer' },
  { name: 'Thể dục', code: 'TD', color: '#F97316', icon: 'fitness' },
  { name: 'Âm nhạc', code: 'NHAC', color: '#A855F7', icon: 'music-note' },
  { name: 'Mỹ thuật', code: 'MT', color: '#FB7185', icon: 'palette' },
];

// Helper functions
function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function generateVietnameseName(gender: 'male' | 'female'): {
  firstName: string;
  lastName: string;
  fullName: string;
} {
  const lastName = randomElement(lastNames);
  const middleName = randomElement(middleNames);
  const firstName = randomElement(firstNames[gender]);
  const fullName = `${lastName} ${middleName} ${firstName}`;

  return { firstName: `${middleName} ${firstName}`, lastName, fullName };
}

function generatePhone(): string {
  const prefixes = ['090', '091', '092', '093', '094', '096', '097', '098', '099'];
  return `${randomElement(prefixes)}${Math.floor(Math.random() * 10000000)
    .toString()
    .padStart(7, '0')}`;
}

function generateAddress(): string {
  const houseNumber = Math.floor(Math.random() * 500) + 1;
  const street = randomElement(streets);
  const district = randomElement(districts);
  return `${houseNumber} ${street}, ${district}, TP.HCM`;
}

function generateDateOfBirth(minAge: number, maxAge: number): Date {
  const now = new Date();
  const age = Math.floor(Math.random() * (maxAge - minAge + 1)) + minAge;
  const year = now.getFullYear() - age;
  const month = Math.floor(Math.random() * 12);
  const day = Math.floor(Math.random() * 28) + 1;
  return new Date(year, month, day);
}

async function seed() {
  console.log('🌱 Starting database seeding...\n');

  const AppDataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: [
      User,
      School,
      Grade,
      AcademicYear,
      Subject,
      Teacher,
      Student,
      Parent,
      StudentParentRelation,
      Class,
      TimeSlot,
      Schedule,
      Attendance,
      GradeRecord,
    ],
    synchronize: true,
  });

  await AppDataSource.initialize();
  console.log('✅ Database connected\n');

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
  const scheduleRepo = AppDataSource.getRepository(Schedule);
  const attendanceRepo = AppDataSource.getRepository(Attendance);
  const gradeRecordRepo = AppDataSource.getRepository(GradeRecord);

  // Clear existing data
  console.log('🗑️  Clearing existing data...');
  await gradeRecordRepo.createQueryBuilder().delete().execute();
  await attendanceRepo.createQueryBuilder().delete().execute();
  await scheduleRepo.createQueryBuilder().delete().execute();
  await timeSlotRepo.createQueryBuilder().delete().execute();
  await relationRepo.createQueryBuilder().delete().execute();
  await studentRepo.createQueryBuilder().delete().execute();
  await parentRepo.createQueryBuilder().delete().execute();
  await classRepo.createQueryBuilder().delete().execute();
  await teacherRepo.createQueryBuilder().delete().execute();
  await subjectRepo.createQueryBuilder().delete().execute();
  await academicYearRepo.createQueryBuilder().delete().execute();
  await gradeRepo.createQueryBuilder().delete().execute();
  await schoolRepo.createQueryBuilder().delete().execute();
  await userRepo.createQueryBuilder().delete().execute();
  console.log('✅ Existing data cleared\n');

  // 1. Create School
  console.log('🏫 Creating school...');
  const school = schoolRepo.create({
    name: 'Trường THCS Nguyễn Du',
    code: 'THCS-ND',
    schoolType: 'middle',
    address: '123 Nguyễn Du, Quận 1, TP. Hồ Chí Minh',
    district: 'Quận 1',
    city: 'TP. Hồ Chí Minh',
    phone: '028-3829-1234',
    email: 'contact@thcsnguyendu.edu.vn',
    website: 'https://thcsnguyendu.edu.vn',
    status: 'active',
  });
  await schoolRepo.save(school);
  console.log(`✅ Created school: ${school.name}\n`);

  // 2. Create Academic Year
  console.log('📅 Creating academic year...');
  const academicYear = academicYearRepo.create({
    schoolId: school.id,
    name: '2024-2025',
    startDate: new Date('2024-09-05'),
    endDate: new Date('2025-05-31'),
    isCurrent: true,
  });
  await academicYearRepo.save(academicYear);
  console.log(`✅ Created academic year: ${academicYear.name}\n`);

  // 3. Create Grades
  console.log('📚 Creating grades...');
  const grades: Grade[] = [];
  for (let level = 6; level <= 9; level++) {
    const grade = gradeRepo.create({
      schoolId: school.id,
      name: `Khối ${level}`,
      gradeLevel: level,
      description: `Lớp ${level} - Trung học cơ sở`,
    });
    await gradeRepo.save(grade);
    grades.push(grade);
    console.log(`  ✓ Grade ${level}`);
  }
  console.log(`✅ Created ${grades.length} grades\n`);

  // 4. Create Subjects for each Grade
  console.log('📖 Creating subjects for each grade...');
  const createdSubjects: Subject[] = [];
  for (const grade of grades) {
    for (const subj of subjects) {
      const subject = subjectRepo.create({
        schoolId: school.id,
        ...subj,
        code: `${subj.code}-${grade.gradeLevel}`, // Ensure unique code per grade
        gradeLevel: grade.gradeLevel,
      });
      await subjectRepo.save(subject);
      createdSubjects.push(subject);
    }
    console.log(`  ✓ Grade ${grade.gradeLevel} subjects`);
  }
  console.log(`✅ Created ${createdSubjects.length} subjects in total\n`);

  // 5. Create Admin Users
  console.log('👤 Creating admin users...');
  const passwordHash = await bcrypt.hash('password123', 12);

  const superAdmin = userRepo.create({
    email: 'admin@thcsnguyendu.edu.vn',
    phone: '0901234567',
    passwordHash,
    fullName: 'Nguyễn Văn Admin',
    role: UserRole.SUPER_ADMIN,
    status: UserStatus.ACTIVE,
  });
  await userRepo.save(superAdmin);
  console.log(`  ✓ Super Admin: ${superAdmin.email}`);

  const principal = userRepo.create({
    email: 'hieutruong@thcsnguyendu.edu.vn',
    phone: '0901234568',
    passwordHash,
    fullName: 'Trần Thị Mai Hương',
    role: UserRole.PRINCIPAL,
    status: UserStatus.ACTIVE,
  });
  await userRepo.save(principal);
  console.log(`  ✓ Principal: ${principal.email}`);

  // Update school with principal
  school.principalId = principal.id;
  await schoolRepo.save(school);

  console.log(`✅ Created admin users\n`);

  // 6. Create Teachers
  console.log('👨‍🏫 Creating teachers...');
  const teachers: Teacher[] = [];
  const teacherSpecializations = [
    'Toán học', 'Ngữ văn', 'Tiếng Anh', 'Vật lý', 'Hóa học',
    'Sinh học', 'Lịch sử', 'Địa lý', 'GDCD', 'Tin học', 'Thể dục', 'Âm nhạc', 'Mỹ thuật',
  ];

  for (let i = 0; i < 15; i++) {
    const gender = Math.random() > 0.5 ? 'male' : 'female';
    const { firstName, lastName, fullName } = generateVietnameseName(gender);

    const user = userRepo.create({
      email: `giaovien${i + 1}@thcsnguyendu.edu.vn`,
      phone: generatePhone(),
      passwordHash,
      fullName,
      role: UserRole.TEACHER,
      status: UserStatus.ACTIVE,
    });
    await userRepo.save(user);

    const teacher = teacherRepo.create({
      teacherCode: `GV${(i + 1).toString().padStart(4, '0')}`,
      userId: user.id,
      schoolId: school.id,
      firstName,
      lastName,
      fullName,
      dateOfBirth: generateDateOfBirth(28, 55),
      gender: gender === 'male' ? 'Nam' : 'Nữ',
      phone: user.phone,
      email: user.email,
      address: generateAddress(),
      specialization: randomElement(teacherSpecializations),
      degree: randomElement(['Cử nhân', 'Thạc sĩ', 'Tiến sĩ']),
      hireDate: new Date(2020 + Math.floor(Math.random() * 5), Math.floor(Math.random() * 12), 1),
      status: UserStatus.ACTIVE,
    });
    await teacherRepo.save(teacher);
    teachers.push(teacher);
  }
  console.log(`✅ Created ${teachers.length} teachers\n`);

  // 7. Create Classes
  console.log('🏛️  Creating classes...');
  const classes: Class[] = [];
  const classNames = ['A', 'B', 'C'];

  for (const grade of grades) {
    for (const className of classNames) {
      const fullClassName = `${grade.gradeLevel}${className}`;
      const homeroomTeacher = randomElement(teachers);

      const classEntity = classRepo.create({
        schoolId: school.id,
        gradeId: grade.id,
        academicYearId: academicYear.id,
        name: fullClassName,
        code: `${school.code}-${academicYear.name.split('-')[0]}-${fullClassName}`,
        homeroomTeacherId: homeroomTeacher.id,
        maxStudents: 40,
        room: `P${grade.gradeLevel}0${classNames.indexOf(className) + 1}`,
      });
      await classRepo.save(classEntity);
      classes.push(classEntity);
      console.log(`  ✓ Class ${fullClassName} - ${homeroomTeacher.fullName}`);
    }
  }
  console.log(`✅ Created ${classes.length} classes\n`);

  // 8. Create Students and Parents
  console.log('👨‍👩‍👧‍👦 Creating students and parents...');
  const studentsPerClass = 30;
  let studentCount = 0;

  for (const classEntity of classes) {
    for (let i = 0; i < studentsPerClass; i++) {
      const gender = Math.random() > 0.5 ? 'male' : 'female';
      const { firstName, lastName, fullName } = generateVietnameseName(gender);

      // Create student user
      const studentUser = userRepo.create({
        email: `hocsinh${studentCount + 1}@thcsnguyendu.edu.vn`,
        phone: generatePhone(),
        passwordHash,
        fullName,
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
      });
      await userRepo.save(studentUser);

      // Create student
      const student = studentRepo.create({
        studentCode: `HS${(studentCount + 1).toString().padStart(5, '0')}`,
        userId: studentUser.id,
        schoolId: school.id,
        firstName,
        lastName,
        fullName,
        dateOfBirth: generateDateOfBirth(11, 15),
        gender: gender === 'male' ? 'Nam' : 'Nữ',
        ethnicity: Math.random() > 0.9 ? randomElement(['Hoa', 'Khmer', 'Tày']) : 'Kinh',
        religion: Math.random() > 0.7 ? randomElement(['Phật giáo', 'Công giáo', 'Cao Đài']) : 'Không',
        nationality: 'Việt Nam',
        birthplace: randomElement(['TP.HCM', 'Hà Nội', 'Đà Nẵng', 'Cần Thơ']),
        address: generateAddress(),
        phone: studentUser.phone,
        email: studentUser.email,
        currentClassId: classEntity.id,
        enrollmentDate: new Date('2024-09-05'),
        status: UserStatus.ACTIVE,
      });
      await studentRepo.save(student);

      // Create parents (father and mother)
      const relationships: Array<{ type: 'father' | 'mother'; isPrimary: boolean }> = [
        { type: 'father', isPrimary: true },
        { type: 'mother', isPrimary: false },
      ];

      for (const rel of relationships) {
        const parentGender = rel.type === 'father' ? 'male' : 'female';
        const parentName = generateVietnameseName(parentGender);

        const parentUser = userRepo.create({
          email: `phuhuynh${studentCount * 2 + (rel.type === 'father' ? 1 : 2)}@thcsnguyendu.edu.vn`,
          phone: generatePhone(),
          passwordHash,
          fullName: parentName.fullName,
          role: UserRole.PARENT,
          status: UserStatus.ACTIVE,
        });
        await userRepo.save(parentUser);

        const parent = parentRepo.create({
          userId: parentUser.id,
          firstName: parentName.firstName,
          lastName: parentName.lastName,
          fullName: parentName.fullName,
          relationship: rel.type === 'father' ? 'Cha' : 'Mẹ',
          phone: parentUser.phone,
          email: parentUser.email,
          occupation: randomElement(occupations),
          workplace: `Công ty ${randomElement(['ABC', 'XYZ', 'DEF', 'GHI'])}`,
          address: student.address,
        });
        await parentRepo.save(parent);

        // Create relation
        const relation = relationRepo.create({
          studentId: student.id,
          parentId: parent.id,
          relationship: rel.type === 'father' ? 'Cha' : 'Mẹ',
          isPrimary: rel.isPrimary,
          isEmergencyContact: rel.isPrimary,
          canPickup: true,
        });
        await relationRepo.save(relation);
      }

      studentCount++;
    }
    console.log(`  ✓ Class ${classEntity.name}: ${studentsPerClass} students`);
  }
  console.log(`✅ Created ${studentCount} students and ${studentCount * 2} parents\n`);

  // 9. Create Time Slots
  console.log('⏰ Creating time slots...');
  const timeSlots = [
    { period: 1, name: 'Tiết 1', startTime: '07:00', endTime: '07:45', duration: 45 },
    { period: 2, name: 'Tiết 2', startTime: '07:50', endTime: '08:35', duration: 45 },
    { period: 3, name: 'Tiết 3', startTime: '08:40', endTime: '09:25', duration: 45 },
    { period: 4, name: 'Ra chơi', startTime: '09:25', endTime: '09:45', duration: 20, isBreak: true },
    { period: 5, name: 'Tiết 4', startTime: '09:45', endTime: '10:30', duration: 45 },
    { period: 6, name: 'Tiết 5', startTime: '10:35', endTime: '11:20', duration: 45 },
    { period: 7, name: 'Nghỉ trưa', startTime: '11:20', endTime: '13:00', duration: 100, isBreak: true },
    { period: 8, name: 'Tiết 6', startTime: '13:00', endTime: '13:45', duration: 45 },
    { period: 9, name: 'Tiết 7', startTime: '13:50', endTime: '14:35', duration: 45 },
    { period: 10, name: 'Tiết 8', startTime: '14:40', endTime: '15:25', duration: 45 },
  ];

  for (const slot of timeSlots) {
    await timeSlotRepo.save({
      schoolId: school.id,
      ...slot,
      isActive: true,
    });
  }
  console.log(`✅ Created ${timeSlots.length} time slots\n`);

  // 10. Create Schedules (Timetables)
  console.log('📅 Creating unique schedules for each class...');
  let scheduleCount = 0;

  // Group subjects by grade level for quick access
  const subjectsByGrade: Record<number, Subject[]> = {};
  for (const grade of grades) {
    subjectsByGrade[grade.gradeLevel] = createdSubjects.filter(s => s.gradeLevel === grade.gradeLevel);
  }

  for (const classEntity of classes) {
    const grade = grades.find(g => g.id === classEntity.gradeId);
    const gradeLevel = grade?.gradeLevel || 6;
    const gradeSubjs = subjectsByGrade[gradeLevel];
    
    // Pick core and elective subjects for this grade
    const math = gradeSubjs.find(s => s.name === 'Toán học');
    const literature = gradeSubjs.find(s => s.name === 'Ngữ văn');
    const english = gradeSubjs.find(s => s.name === 'Tiếng Anh');
    const others = gradeSubjs.filter(s => !['Toán học', 'Ngữ văn', 'Tiếng Anh'].includes(s.name));

    const days = [
      DayOfWeek.MONDAY,
      DayOfWeek.TUESDAY,
      DayOfWeek.WEDNESDAY,
      DayOfWeek.THURSDAY,
      DayOfWeek.FRIDAY
    ];

    for (const day of days) {
      // Create a daily pool: 2 core subjects + 3 other subjects
      const dailyPool = [
        math, literature, english,
        randomElement(others),
        randomElement(others)
      ].filter(Boolean) as Subject[];

      // Randomize position in the morning (1, 2, 3, 5) and afternoon (6)
      const shuffledSubjs = dailyPool.sort(() => Math.random() - 0.5);
      const periods = [1, 2, 3, 5, 6];

      for (let i = 0; i < periods.length; i++) {
        const period = periods[i];
        const subject = shuffledSubjs[i % shuffledSubjs.length];
        const teacher = randomElement(teachers.filter(t => t.specialization === subject.name)) || randomElement(teachers);
        const timeSlot = timeSlots.find(t => t.period === period && !t.isBreak);

        if (timeSlot) {
          await scheduleRepo.save({
            classId: classEntity.id,
            schoolId: school.id,
            academicYearId: academicYear.id,
            semester: Semester.SEMESTER_1,
            dayOfWeek: day,
            period: period,
            startTime: new Date(`2024-01-01 ${timeSlot.startTime}`),
            endTime: new Date(`2024-01-01 ${timeSlot.endTime}`),
            subjectId: subject.id,
            teacherId: teacher.id,
            room: classEntity.room || `P${classEntity.name}`,
            isActive: true,
            createdBy: 'system',
          });
          scheduleCount++;
        }
      }
    }
    console.log(`  ✓ Timetable for Class ${classEntity.name} (Grade ${gradeLevel})`);
  }
  console.log(`✅ Created ${scheduleCount} schedule entries\n`);

  // 11. Create Attendance Records (last 30 days)
  console.log('✅ Creating attendance records...');
  let attendanceCount = 0;
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);

  // Get all students as array
  const allStudents = await studentRepo.find();

  for (let d = new Date(thirtyDaysAgo); d <= today; d.setDate(d.getDate() + 1)) {
    // Skip weekends
    if (d.getDay() === 0 || d.getDay() === 6) continue;

    for (const student of allStudents) {
      // 85% present, 10% absent, 5% late/excused
      const rand = Math.random();
      let status: AttendanceStatus;
      if (rand < 0.85) status = AttendanceStatus.PRESENT;
      else if (rand < 0.95) status = AttendanceStatus.ABSENT;
      else status = randomElement([AttendanceStatus.LATE, AttendanceStatus.EXCUSED]);

      await attendanceRepo.save({
        studentId: student.id,
        classId: student.currentClassId,
        schoolId: student.schoolId,
        date: new Date(d),
        session: 'all_day',
        status,
        markedBy: randomElement(teachers).id,
        markedAt: new Date(d),
      });
      attendanceCount++;
    }
  }
  console.log(`✅ Created ${attendanceCount} attendance records\n`);

  // 12. Create Grade Records (Semester 1)
  console.log('📝 Creating grade records...');
  let gradeCount = 0;

  // For each student, create grades for all subjects
  for (const student of allStudents) {
    for (const subject of createdSubjects) {
      // Skip non-academic subjects
      if (['Thể dục', 'Âm nhạc', 'Mỹ thuật'].includes(subject.name)) continue;

      // Oral grades (3-5 grades)
      const oralCount = 3 + Math.floor(Math.random() * 3);
      for (let i = 1; i <= oralCount; i++) {
        await gradeRecordRepo.save({
          studentId: student.id,
          subjectId: subject.id,
          classId: student.currentClassId,
          schoolId: student.schoolId,
          academicYearId: academicYear.id,
          semester: Semester.SEMESTER_1,
          gradeType: GradeType.ORAL,
          examNumber: i,
          score: 5 + Math.random() * 5, // 5-10
          coefficient: 1,
          examDate: new Date('2024-10-01'),
          teacherId: randomElement(teachers).id,
          enteredBy: randomElement(teachers).id,
          enteredAt: new Date(),
          isPublished: true,
          publishedAt: new Date(),
        });
        gradeCount++;
      }

      // 15-minute quiz (2-3 grades)
      const quiz15Count = 2 + Math.floor(Math.random() * 2);
      for (let i = 1; i <= quiz15Count; i++) {
        await gradeRecordRepo.save({
          studentId: student.id,
          subjectId: subject.id,
          classId: student.currentClassId,
          schoolId: student.schoolId,
          academicYearId: academicYear.id,
          semester: Semester.SEMESTER_1,
          gradeType: GradeType.QUIZ_15,
          examNumber: i,
          score: 5 + Math.random() * 5,
          coefficient: 1,
          examDate: new Date('2024-10-15'),
          teacherId: randomElement(teachers).id,
          enteredBy: randomElement(teachers).id,
          enteredAt: new Date(),
          isPublished: true,
          publishedAt: new Date(),
        });
        gradeCount++;
      }

      // 45-minute test (2 grades)
      for (let i = 1; i <= 2; i++) {
        await gradeRecordRepo.save({
          studentId: student.id,
          subjectId: subject.id,
          classId: student.currentClassId,
          schoolId: student.schoolId,
          academicYearId: academicYear.id,
          semester: Semester.SEMESTER_1,
          gradeType: GradeType.QUIZ_45,
          examNumber: i,
          score: 5 + Math.random() * 5,
          coefficient: 2,
          examDate: new Date('2024-11-01'),
          teacherId: randomElement(teachers).id,
          enteredBy: randomElement(teachers).id,
          enteredAt: new Date(),
          isPublished: true,
          publishedAt: new Date(),
        });
        gradeCount++;
      }

      // Final exam (1 grade)
      await gradeRecordRepo.save({
        studentId: student.id,
        subjectId: subject.id,
        classId: student.currentClassId,
        schoolId: student.schoolId,
        academicYearId: academicYear.id,
        semester: Semester.SEMESTER_1,
        gradeType: GradeType.FINAL,
        examNumber: 1,
        score: 5 + Math.random() * 5,
        coefficient: 3,
        examDate: new Date('2024-12-15'),
        teacherId: randomElement(teachers).id,
        enteredBy: randomElement(teachers).id,
        enteredAt: new Date(),
        isPublished: true,
        publishedAt: new Date(),
      });
      gradeCount++;
    }
  }
  console.log(`✅ Created ${gradeCount} grade records\n`);

  // Summary
  console.log('\n═══════════════════════════════════════════════');
  console.log('🎉 Database seeding completed successfully!\n');
  console.log('📊 Summary:');
  console.log(`   • Schools: 1`);
  console.log(`   • Academic Years: 1`);
  console.log(`   • Grades: ${grades.length}`);
  console.log(`   • Subjects: ${createdSubjects.length}`);
  console.log(`   • Teachers: ${teachers.length}`);
  console.log(`   • Classes: ${classes.length}`);
  console.log(`   • Students: ${studentCount}`);
  console.log(`   • Parents: ${studentCount * 2}`);
  console.log(`   • Total Users: ${2 + teachers.length + studentCount + studentCount * 2}`);
  console.log(`   • Time Slots: ${timeSlots.length}`);
  console.log(`   • Schedules: ${scheduleCount}`);
  console.log(`   • Attendance Records: ${attendanceCount}`);
  console.log(`   • Grade Records: ${gradeCount}`);
  console.log('\n🔑 Login Credentials:');
  console.log(`   • Super Admin: admin@thcsnguyendu.edu.vn / password123`);
  console.log(`   • Principal: hieutruong@thcsnguyendu.edu.vn / password123`);
  console.log(`   • Teachers: giaovien1@thcsnguyendu.edu.vn / password123`);
  console.log(`   • Students: hocsinh1@thcsnguyendu.edu.vn / password123`);
  console.log(`   • Parents: phuhuynh1@thcsnguyendu.edu.vn / password123`);
  console.log('═══════════════════════════════════════════════\n');

  await AppDataSource.destroy();
}

seed()
  .then(() => {
    console.log('✅ Seeding process finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  });
