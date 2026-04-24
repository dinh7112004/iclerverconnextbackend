import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';
import { User } from './src/modules/users/entities/user.entity';
import { School } from './src/modules/schools/entities/school.entity';
import { Grade } from './src/modules/schools/entities/grade.entity';
import { AcademicYear } from './src/modules/schools/entities/academic-year.entity';
import { Subject } from './src/modules/subjects/entities/subject.entity';
import { Teacher } from './src/modules/teachers/entities/teacher.entity';
import { Student } from './src/modules/students/entities/student.entity';
import { Parent } from './src/modules/parents/entities/parent.entity';
import { StudentParentRelation } from './src/modules/parents/entities/student-parent-relation.entity';
import { Class } from './src/modules/classes/entities/class.entity';

async function resetPassword() {
  const AppDataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: [User, School, Grade, AcademicYear, Subject, Teacher, Student, Parent, StudentParentRelation, Class],
    ssl: { rejectUnauthorized: false }
  });

  await AppDataSource.initialize();
  console.log('✅ Database connected');

  const userRepo = AppDataSource.getRepository(User);
  const passwordHash = await bcrypt.hash('password123', 12);

  const email = 'phuhuynh1@thcsnguyendu.edu.vn';
  const user = await userRepo.findOne({ where: { email } });

  if (user) {
    user.passwordHash = passwordHash;
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    await userRepo.save(user);
    console.log(`✅ Password reset for ${email} to 'password123'`);
  } else {
    console.log(`❌ User ${email} not found`);
  }

  await AppDataSource.destroy();
}

resetPassword();
