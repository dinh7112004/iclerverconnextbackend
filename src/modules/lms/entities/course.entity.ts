import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum CourseStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum CourseDifficulty {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

export enum ContentType {
  VIDEO = 'video',
  DOCUMENT = 'document',
  SLIDE = 'slide',
  AUDIO = 'audio',
  LINK = 'link',
  QUIZ = 'quiz',
  ASSIGNMENT = 'assignment',
  INTERACTIVE = 'interactive',
}

@Schema({ timestamps: true })
export class Course extends Document {
  @Prop({ required: true })
  code: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  @Prop({ required: true })
  subjectId: string;

  @Prop()
  subjectName: string;

  @Prop({ required: true })
  teacherId: string;

  @Prop()
  teacherName: string;

  @Prop({ type: [String], default: [] })
  coTeachers: string[]; // Additional teacher IDs

  @Prop()
  academicYear: string;

  @Prop()
  semester: string;

  @Prop({ type: [String], default: [] })
  classIds: string[]; // Classes enrolled in this course

  @Prop({ type: [String], default: [] })
  studentIds: string[]; // Individual students enrolled

  @Prop({ enum: CourseStatus, default: CourseStatus.DRAFT })
  status: CourseStatus;

  @Prop({ enum: CourseDifficulty, default: CourseDifficulty.BEGINNER })
  difficulty: CourseDifficulty;

  @Prop()
  thumbnailUrl: string;

  @Prop()
  bannerUrl: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: [String], default: [] })
  learningObjectives: string[];

  @Prop({ type: [String], default: [] })
  prerequisites: string[];

  @Prop({ default: 0 })
  estimatedHours: number;

  @Prop()
  startDate: Date;

  @Prop()
  endDate: Date;

  @Prop({ default: 0 })
  totalLessons: number;

  @Prop({ default: 0 })
  totalAssignments: number;

  @Prop({ default: 0 })
  totalQuizzes: number;

  @Prop({ default: 0 })
  enrollmentCount: number;

  @Prop({ default: 0 })
  completionRate: number; // Percentage

  @Prop({ default: 0 })
  averageRating: number;

  @Prop({ default: 0 })
  totalReviews: number;

  @Prop({ default: true })
  allowSelfEnrollment: boolean;

  @Prop()
  enrollmentKey: string; // Optional key for enrollment

  @Prop({ default: true })
  enableDiscussions: boolean;

  @Prop({ default: true })
  enableNotifications: boolean;

  @Prop({ type: Object })
  gradingScheme: {
    passingGrade: number;
    gradingScale: Array<{
      grade: string;
      minScore: number;
      maxScore: number;
    }>;
  };

  @Prop()
  createdBy: string;

  @Prop()
  lastUpdatedBy: string;
}

export const CourseSchema = SchemaFactory.createForClass(Course);

// Indexes
CourseSchema.index({ code: 1 }, { unique: true });
CourseSchema.index({ teacherId: 1, academicYear: 1, semester: 1 });
CourseSchema.index({ status: 1, startDate: 1 });
CourseSchema.index({ subjectId: 1, academicYear: 1 });
CourseSchema.index({ tags: 1 });

// ============================================
// LESSON ENTITY
// ============================================

@Schema({ timestamps: true })
export class Lesson extends Document {
  @Prop({ required: true })
  courseId: string;

  @Prop({ required: true })
  title: string;

  @Prop()
  description: string;

  @Prop({ required: true, default: 1 })
  order: number;

  @Prop()
  moduleId: string; // Optional: group lessons into modules/chapters

  @Prop()
  moduleName: string;

  @Prop({ default: 0 })
  estimatedMinutes: number;

  @Prop()
  scheduledDate: Date;

  @Prop({ default: true })
  isPublished: boolean;

  @Prop({ default: false })
  isMandatory: boolean;

  @Prop({ type: [String], default: [] })
  prerequisites: string[]; // Lesson IDs that must be completed first

  @Prop({ type: [Object], default: [] })
  contents: Array<{
    id: string;
    type: ContentType;
    title: string;
    description?: string;
    url?: string;
    fileUrl?: string;
    duration?: number; // For video/audio in seconds
    size?: number; // File size in bytes
    mimeType?: string;
    thumbnailUrl?: string;
    order: number;
    isMandatory: boolean;
    allowDownload: boolean;
    metadata?: any;
  }>;

  @Prop({ type: [Object], default: [] })
  resources: Array<{
    id: string;
    name: string;
    description?: string;
    fileUrl: string;
    fileType: string;
    size: number;
    uploadedAt: Date;
  }>;

  @Prop({ type: Object })
  liveSession: {
    meetingUrl: string;
    meetingId: string;
    password?: string;
    scheduledAt: Date;
    duration: number;
    isRecorded: boolean;
    recordingUrl?: string;
  };

  @Prop({ default: 0 })
  viewCount: number;

  @Prop({ default: 0 })
  completionCount: number;

  @Prop()
  createdBy: string;

  @Prop()
  lastUpdatedBy: string;
}

export const LessonSchema = SchemaFactory.createForClass(Lesson);

// Indexes
LessonSchema.index({ courseId: 1, order: 1 });
LessonSchema.index({ courseId: 1, moduleId: 1, order: 1 });
LessonSchema.index({ isPublished: 1, scheduledDate: 1 });

// ============================================
// STUDENT PROGRESS ENTITY
// ============================================

export enum ProgressStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

@Schema({ timestamps: true })
export class StudentProgress extends Document {
  @Prop({ required: true })
  studentId: string;

  @Prop()
  studentName: string;

  @Prop({ required: true })
  courseId: string;

  @Prop()
  courseName: string;

  @Prop()
  enrolledAt: Date;

  @Prop()
  lastAccessedAt: Date;

  @Prop({ enum: ProgressStatus, default: ProgressStatus.NOT_STARTED })
  status: ProgressStatus;

  @Prop({ default: 0 })
  progressPercentage: number;

  @Prop({ type: [Object], default: [] })
  lessonProgress: Array<{
    lessonId: string;
    lessonTitle: string;
    status: ProgressStatus;
    startedAt?: Date;
    completedAt?: Date;
    timeSpent: number; // In seconds
    lastPosition?: number; // For video/audio playback resume
    completedContents: string[]; // Content IDs completed
    score?: number;
  }>;

  @Prop({ type: [Object], default: [] })
  assignmentScores: Array<{
    assignmentId: string;
    assignmentTitle: string;
    score: number;
    maxScore: number;
    submittedAt?: Date;
    gradedAt?: Date;
  }>;

  @Prop({ type: [Object], default: [] })
  quizScores: Array<{
    quizId: string;
    quizTitle: string;
    score: number;
    maxScore: number;
    attempts: number;
    bestScore: number;
    lastAttemptAt?: Date;
  }>;

  @Prop({ default: 0 })
  overallScore: number;

  @Prop({ default: 0 })
  overallGrade: number;

  @Prop()
  letterGrade: string;

  @Prop({ default: 0 })
  totalTimeSpent: number; // In seconds

  @Prop({ default: false })
  isCompleted: boolean;

  @Prop()
  completedAt: Date;

  @Prop()
  certificateUrl: string;

  @Prop({ type: Object })
  rating: {
    score: number;
    review: string;
    ratedAt: Date;
  };

  @Prop({ type: [String], default: [] })
  badges: string[]; // Achievement badge IDs
}

export const StudentProgressSchema = SchemaFactory.createForClass(StudentProgress);

// Indexes
StudentProgressSchema.index({ studentId: 1, courseId: 1 }, { unique: true });
StudentProgressSchema.index({ courseId: 1, status: 1 });
StudentProgressSchema.index({ studentId: 1, status: 1 });
StudentProgressSchema.index({ enrolledAt: 1 });
