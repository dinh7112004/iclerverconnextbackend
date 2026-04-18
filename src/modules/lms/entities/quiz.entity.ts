import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum QuizType {
  PRACTICE = 'practice',
  GRADED = 'graded',
  SURVEY = 'survey',
  EXAM = 'exam',
}

export enum QuestionType {
  MULTIPLE_CHOICE = 'multiple_choice',
  TRUE_FALSE = 'true_false',
  SHORT_ANSWER = 'short_answer',
  ESSAY = 'essay',
  MATCHING = 'matching',
  FILL_IN_BLANK = 'fill_in_blank',
  ORDERING = 'ordering',
}

export enum QuizStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  CLOSED = 'closed',
}

export enum AttemptStatus {
  IN_PROGRESS = 'in_progress',
  SUBMITTED = 'submitted',
  GRADED = 'graded',
  ABANDONED = 'abandoned',
}

@Schema({ timestamps: true })
export class Quiz extends Document {
  @Prop({ required: true })
  courseId: string;

  @Prop()
  courseName: string;

  @Prop()
  lessonId: string;

  @Prop({ required: true })
  title: string;

  @Prop()
  description: string;

  @Prop()
  instructions: string;

  @Prop({ enum: QuizType, default: QuizType.PRACTICE })
  type: QuizType;

  @Prop({ enum: QuizStatus, default: QuizStatus.DRAFT })
  status: QuizStatus;

  @Prop({ default: 0 })
  totalPoints: number;

  @Prop({ default: 0 })
  passingScore: number;

  @Prop()
  timeLimit: number; // In minutes

  @Prop()
  availableFrom: Date;

  @Prop()
  availableUntil: Date;

  @Prop()
  dueDate: Date;

  @Prop({ default: -1 })
  maxAttempts: number; // -1 = unlimited

  @Prop({ default: false })
  shuffleQuestions: boolean;

  @Prop({ default: false })
  shuffleAnswers: boolean;

  @Prop({ default: false })
  showCorrectAnswers: boolean;

  @Prop()
  showCorrectAnswersAt: Date; // When to reveal correct answers

  @Prop({ default: true })
  showScore: boolean;

  @Prop({ default: false })
  showFeedback: boolean;

  @Prop({ default: false })
  oneQuestionAtATime: boolean;

  @Prop({ default: false })
  lockQuestionsAfterAnswering: boolean;

  @Prop({ default: false })
  requireLockdownBrowser: boolean;

  @Prop({ default: false })
  requireProctoring: boolean;

  @Prop({ default: false })
  preventCopyPaste: boolean;

  @Prop({ type: [Object], default: [] })
  questions: Array<{
    id: string;
    type: QuestionType;
    question: string;
    points: number;
    order: number;
    required: boolean;

    // For multiple choice, true/false
    options?: Array<{
      id: string;
      text: string;
      isCorrect: boolean;
      feedback?: string;
    }>;

    // For short answer, essay
    correctAnswer?: string;
    acceptedAnswers?: string[];
    caseSensitive?: boolean;

    // For matching
    matchPairs?: Array<{
      left: string;
      right: string;
    }>;

    // For ordering
    correctOrder?: string[];
    items?: string[];

    // For fill in blank
    blanks?: Array<{
      position: number;
      acceptedAnswers: string[];
    }>;

    explanation?: string;
    hint?: string;
    imageUrl?: string;
    videoUrl?: string;
  }>;

  @Prop({ default: 0 })
  totalQuestions: number;

  @Prop({ default: 0 })
  attemptCount: number;

  @Prop({ default: 0 })
  averageScore: number;

  @Prop({ default: 0 })
  highestScore: number;

  @Prop({ default: 0 })
  lowestScore: number;

  @Prop()
  createdBy: string;

  @Prop()
  lastUpdatedBy: string;
}

export const QuizSchema = SchemaFactory.createForClass(Quiz);

// Indexes
QuizSchema.index({ courseId: 1, dueDate: 1 });
QuizSchema.index({ status: 1, availableFrom: 1 });
QuizSchema.index({ lessonId: 1 });

// Pre-save hook to calculate total points
QuizSchema.pre('save', function (next) {
  if (this.isModified('questions')) {
    this.totalQuestions = this.questions.length;
    this.totalPoints = this.questions.reduce((sum, q) => sum + q.points, 0);
  }
  next();
});

// ============================================
// QUIZ ATTEMPT ENTITY
// ============================================

@Schema({ timestamps: true })
export class QuizAttempt extends Document {
  @Prop({ required: true })
  quizId: string;

  @Prop()
  quizTitle: string;

  @Prop({ required: true })
  courseId: string;

  @Prop({ required: true })
  studentId: string;

  @Prop()
  studentName: string;

  @Prop({ required: true })
  attemptNumber: number;

  @Prop({ enum: AttemptStatus, default: AttemptStatus.IN_PROGRESS })
  status: AttemptStatus;

  @Prop()
  startedAt: Date;

  @Prop()
  submittedAt: Date;

  @Prop()
  timeSpent: number; // In seconds

  @Prop()
  timeRemaining: number; // For timed quizzes

  @Prop({ type: [Object], default: [] })
  answers: Array<{
    questionId: string;
    questionType: QuestionType;
    answer: any; // Can be string, array, object depending on question type
    selectedOptions?: string[]; // For multiple choice
    matchedPairs?: Array<{ left: string; right: string }>; // For matching
    orderedItems?: string[]; // For ordering
    fillAnswers?: string[]; // For fill in blank
    isCorrect?: boolean;
    pointsEarned?: number;
    feedback?: string;
    answeredAt: Date;
  }>;

  @Prop()
  score: number;

  @Prop()
  maxScore: number;

  @Prop()
  percentage: number;

  @Prop()
  passed: boolean;

  @Prop()
  feedback: string;

  @Prop({ default: false })
  isAutoGraded: boolean;

  @Prop()
  gradedBy: string;

  @Prop()
  gradedAt: Date;

  @Prop()
  ipAddress: string;

  @Prop()
  userAgent: string;

  @Prop({ type: Object })
  proctoring: {
    isProctored: boolean;
    proctoringService: string;
    sessionId: string;
    recordingUrl: string;
    flagged: boolean;
    flags: Array<{
      type: string;
      description: string;
      timestamp: Date;
      severity: string;
    }>;
  };

  @Prop({ type: [Object], default: [] })
  snapshots: Array<{
    timestamp: Date;
    imageUrl: string;
    flagged: boolean;
  }>;

  @Prop({ type: [Object], default: [] })
  activityLog: Array<{
    timestamp: Date;
    action: string;
    details: any;
  }>;
}

export const QuizAttemptSchema = SchemaFactory.createForClass(QuizAttempt);

// Indexes
QuizAttemptSchema.index({ quizId: 1, studentId: 1, attemptNumber: 1 }, { unique: true });
QuizAttemptSchema.index({ courseId: 1, studentId: 1 });
QuizAttemptSchema.index({ status: 1, submittedAt: 1 });
QuizAttemptSchema.index({ quizId: 1, status: 1 });
