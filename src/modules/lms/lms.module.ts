import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { LMSController } from './lms.controller';
import { LMSService } from './lms.service';
import {
  Course,
  CourseSchema,
  Lesson,
  LessonSchema,
  StudentProgress,
  StudentProgressSchema,
} from './entities/course.entity';
import {
  Assignment,
  AssignmentSchema,
  Submission,
  SubmissionSchema,
} from './entities/assignment.entity';
import {
  Quiz,
  QuizSchema,
  QuizAttempt,
  QuizAttemptSchema,
} from './entities/quiz.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    MongooseModule.forFeature([
      { name: Course.name, schema: CourseSchema },
      { name: Lesson.name, schema: LessonSchema },
      { name: StudentProgress.name, schema: StudentProgressSchema },
      { name: Assignment.name, schema: AssignmentSchema },
      { name: Submission.name, schema: SubmissionSchema },
      { name: Quiz.name, schema: QuizSchema },
      { name: QuizAttempt.name, schema: QuizAttemptSchema },
    ]),
  ],
  controllers: [LMSController],
  providers: [LMSService],
  exports: [LMSService],
})
export class LMSModule {}
