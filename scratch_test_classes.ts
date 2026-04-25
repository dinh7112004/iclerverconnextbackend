import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { DataSource } from 'typeorm';
import { Grade } from './src/modules/schools/entities/grade.entity';
import { Class } from './src/modules/classes/entities/class.entity';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  const gradeRepo = dataSource.getRepository(Grade);
  const classRepo = dataSource.getRepository(Class);

  const grades = await gradeRepo.find();
  console.log("Found grades:", grades.length);

  for (const grade of grades) {
    const classes = await classRepo.find({ where: { gradeId: grade.id } });
    console.log(`Classes for grade ${grade.gradeLevel} (ID: ${grade.id}):`, classes.length);
    if (classes.length > 0) {
      console.log("Sample class:", classes[0].name, classes[0].id);
    }
  }

  await app.close();
}

bootstrap();
