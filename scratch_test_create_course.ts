import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { LMSService } from './src/modules/lms/lms.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const lmsService = app.get(LMSService);

  console.log("Creating test course...");
  const course = await lmsService.createCourse({
    code: `TEST-${Date.now()}`,
    name: 'Test Course',
    description: 'Testing if this saves to Mongo',
    subjectId: 'dummy',
    subjectName: 'Test',
    teacherId: 'dummy',
    teacherName: 'Test Teacher',
    academicYear: '2024-2025',
    semester: '1',
    createdBy: 'system'
  });
  
  console.log("Course created with ID:", course._id);

  // @ts-ignore
  const courses = await lmsService.courseModel.find({});
  console.log("Total courses in DB now:", courses.length);
  
  await app.close();
}

bootstrap();
