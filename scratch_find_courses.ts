import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { LMSService } from './src/modules/lms/lms.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const lmsService = app.get(LMSService);

  // @ts-ignore
  const courses = await lmsService.courseModel.find({});
  console.log(`Found ${courses.length} courses via NestJS`);
  if (courses.length > 0) {
    console.log("First 5 course codes:", courses.slice(0, 5).map(c => c.code));
    console.log("ClassIds of first course:", courses[0].classIds);
  }

  await app.close();
}

bootstrap();
