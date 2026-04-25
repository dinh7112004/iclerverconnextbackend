import { DataSource } from 'typeorm';
import { Student } from './modules/students/entities/student.entity';
import { User } from './modules/users/entities/user.entity';
import { Parent } from './modules/parents/entities/parent.entity';
import * as dotenv from 'dotenv';

dotenv.config();

async function run() {
  const AppDataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: [Student, User, Parent],
    synchronize: false,
  });

  await AppDataSource.initialize();
  const studentRepo = AppDataSource.getRepository(Student);
  const userRepo = AppDataSource.getRepository(User);
  const parentRepo = AppDataSource.getRepository(Parent);

  const student = await studentRepo.createQueryBuilder('student')
    .where('student.fullName ILIKE :name', { name: '%Đào Hữu Thành%' })
    .getOne();

  if (student) {
    console.log('Tìm thấy học sinh PG:', student.fullName, 'ID:', student.id);
    const user = await userRepo.findOne({ where: { studentId: student.id } });
    if (user) {
       console.log('Tìm thấy User ID cho học sinh:', user.id);
    }
    
    // Tìm phụ huynh
    const parent = await parentRepo.createQueryBuilder('parent')
      .innerJoin('student_parent_relation', 'rel', 'rel.parentId = parent.id')
      .where('rel.studentId = :sid', { sid: student.id })
      .getOne();
    
    if (parent) {
       console.log('Tìm thấy Phụ huynh PG, userId:', parent.userId);
    }
  } else {
    console.log('KHÔNG tìm thấy học sinh Đào Hữu Thành trong PG');
  }
  
  await AppDataSource.destroy();
}
run();
