import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { User } from '../src/modules/users/entities/user.entity';
import { Student } from '../src/modules/students/entities/student.entity';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  const userRepo = dataSource.getRepository(User);
  const studentRepo = dataSource.getRepository(Student);

  const student = await studentRepo.findOne({
    where: { id: 'a4777360-006b-41b4-870f-23d897277144' },
    relations: ['user']
  });

  if (student) {
    console.log('USER_ID:', student.user.id);
    console.log('STUDENT_ID:', student.id);
    console.log('STUDENT_EMAIL:', student.user.email);
    console.log('CLASS_ID:', student.currentClassId);
  } else {
    console.log('Student not found');
  }

  await app.close();
}

bootstrap();
