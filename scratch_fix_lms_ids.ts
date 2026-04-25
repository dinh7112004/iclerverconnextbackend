import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { DataSource } from 'typeorm';
import { Grade } from './src/modules/schools/entities/grade.entity';
import { Class } from './src/modules/classes/entities/class.entity';
import { LMSService } from './src/modules/lms/lms.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  const gradeRepo = dataSource.getRepository(Grade);
  const classRepo = dataSource.getRepository(Class);
  const lmsService = app.get(LMSService);

  const grades = await gradeRepo.find();
  console.log("Found grades:", grades.length);

  for (const grade of grades) {
    const classes = await classRepo.find({ where: { gradeId: grade.id } });
    const classIds = classes.map(c => c.id);
    console.log(`Grade ${grade.gradeLevel} has classes:`, classIds);
    
    if (classIds.length > 0) {
      // Find courses for this grade. The code ends with G{gradeLevel}
      // @ts-ignore
      const courses = await lmsService.courseModel.find({ code: { $regex: `-G${grade.gradeLevel}$` } });
      console.log(`Found ${courses.length} courses for grade ${grade.gradeLevel}`);
      
      for (const course of courses) {
        // Force update classIds
        // @ts-ignore
        await lmsService.courseModel.updateOne(
          { _id: course._id },
          { $set: { classIds: classIds, status: 'published' } }
        );
        console.log(`Updated course ${course.code} with ${classIds.length} classes.`);
      }
    }
  }

  // Also check assignments
  // @ts-ignore
  const allCourses = await lmsService.courseModel.find({});
  for (const course of allCourses) {
    // @ts-ignore
    await lmsService.assignmentModel.updateMany(
      { courseId: course._id.toString() },
      { $set: { status: 'published' } }
    );
  }

  console.log("SUCCESSFULLY LINKED LMS TO CLASSES!");
  await app.close();
}

bootstrap();
