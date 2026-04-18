import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum AssignmentType {
  INDIVIDUAL = 'individual',
  GROUP = 'group',
  PEER_REVIEW = 'peer_review',
}

export enum SubmissionType {
  FILE_UPLOAD = 'file_upload',
  TEXT_ENTRY = 'text_entry',
  LINK = 'link',
  CODE = 'code',
  MULTIMEDIA = 'multimedia',
}

export enum AssignmentStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  CLOSED = 'closed',
}

export enum SubmissionStatus {
  NOT_SUBMITTED = 'not_submitted',
  SUBMITTED = 'submitted',
  LATE = 'late',
  GRADED = 'graded',
  RETURNED = 'returned',
  RESUBMIT = 'resubmit',
}

@Schema({ timestamps: true })
export class Assignment extends Document {
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

  @Prop({ enum: AssignmentType, default: AssignmentType.INDIVIDUAL })
  type: AssignmentType;

  @Prop({ type: [String], default: [SubmissionType.FILE_UPLOAD] })
  allowedSubmissionTypes: SubmissionType[];

  @Prop({ required: true })
  maxScore: number;

  @Prop({ default: 0 })
  passingScore: number;

  @Prop({ required: true })
  dueDate: Date;

  @Prop()
  availableFrom: Date;

  @Prop()
  availableUntil: Date;

  @Prop({ default: false })
  allowLateSubmission: boolean;

  @Prop({ default: 0 })
  lateSubmissionPenalty: number; // Percentage deduction

  @Prop({ default: 1 })
  maxAttempts: number;

  @Prop({ default: 0 })
  currentAttempts: number;

  @Prop({ enum: AssignmentStatus, default: AssignmentStatus.DRAFT })
  status: AssignmentStatus;

  @Prop({ type: [Object], default: [] })
  attachments: Array<{
    id: string;
    name: string;
    fileUrl: string;
    fileType: string;
    size: number;
  }>;

  @Prop({ type: [String], default: [] })
  rubricCriteria: string[];

  @Prop({ type: Object })
  rubric: {
    criteria: Array<{
      id: string;
      name: string;
      description: string;
      points: number;
      levels: Array<{
        level: string;
        description: string;
        points: number;
      }>;
    }>;
  };

  @Prop({ default: false })
  requirePlagiarismCheck: boolean;

  @Prop({ default: false })
  enablePeerReview: boolean;

  @Prop({ default: 0 })
  peerReviewsRequired: number;

  @Prop({ default: false })
  anonymousPeerReview: boolean;

  @Prop({ default: false })
  enableAutoGrading: boolean;

  @Prop()
  autoGradingTemplateId: string; // Link to AutoGradingTemplate

  @Prop({ default: false })
  groupAssignment: boolean;

  @Prop({ default: 2 })
  minGroupSize: number;

  @Prop({ default: 5 })
  maxGroupSize: number;

  @Prop({ default: 0 })
  submissionCount: number;

  @Prop({ default: 0 })
  gradedCount: number;

  @Prop({ default: 0 })
  averageScore: number;

  @Prop()
  createdBy: string;

  @Prop()
  lastUpdatedBy: string;
}

export const AssignmentSchema = SchemaFactory.createForClass(Assignment);

// Indexes
AssignmentSchema.index({ courseId: 1, dueDate: 1 });
AssignmentSchema.index({ status: 1, dueDate: 1 });
AssignmentSchema.index({ lessonId: 1 });

// ============================================
// SUBMISSION ENTITY
// ============================================

@Schema({ timestamps: true })
export class Submission extends Document {
  @Prop({ required: true })
  assignmentId: string;

  @Prop()
  assignmentTitle: string;

  @Prop({ required: true })
  courseId: string;

  @Prop({ required: true })
  studentId: string;

  @Prop()
  studentName: string;

  @Prop()
  groupId: string; // For group assignments

  @Prop({ type: [String], default: [] })
  groupMembers: string[]; // Student IDs in the group

  @Prop({ default: 1 })
  attemptNumber: number;

  @Prop({ enum: SubmissionStatus, default: SubmissionStatus.NOT_SUBMITTED })
  status: SubmissionStatus;

  @Prop()
  submittedAt: Date;

  @Prop({ default: false })
  isLate: boolean;

  @Prop({ type: [Object], default: [] })
  files: Array<{
    id: string;
    name: string;
    fileUrl: string;
    fileType: string;
    size: number;
    uploadedAt: Date;
  }>;

  @Prop()
  textContent: string;

  @Prop()
  linkUrl: string;

  @Prop()
  codeContent: string;

  @Prop()
  codeLanguage: string;

  @Prop()
  score: number;

  @Prop()
  maxScore: number;

  @Prop()
  percentage: number;

  @Prop()
  letterGrade: string;

  @Prop()
  feedback: string;

  @Prop({ type: [Object], default: [] })
  rubricScores: Array<{
    criteriaId: string;
    criteriaName: string;
    score: number;
    maxScore: number;
    feedback: string;
  }>;

  @Prop()
  gradedBy: string;

  @Prop()
  gradedAt: Date;

  @Prop()
  returnedAt: Date;

  @Prop({ default: false })
  requiresResubmission: boolean;

  @Prop()
  resubmissionFeedback: string;

  @Prop()
  resubmissionDueDate: Date;

  @Prop({ type: Object })
  plagiarismCheck: {
    checked: boolean;
    checkedAt: Date;
    similarityScore: number;
    reportUrl: string;
    flagged: boolean;
  };

  @Prop({ type: [Object], default: [] })
  peerReviews: Array<{
    reviewerId: string;
    reviewerName: string;
    score: number;
    feedback: string;
    rubricScores: any[];
    submittedAt: Date;
  }>;

  @Prop({ type: Object })
  autoGradingResult: {
    resultId: string;
    score: number;
    feedback: string;
    gradedAt: Date;
    confidence: number;
  };

  @Prop({ type: [Object], default: [] })
  revisionHistory: Array<{
    version: number;
    submittedAt: Date;
    files: any[];
    textContent?: string;
    score?: number;
    feedback?: string;
  }>;

  @Prop({ type: [Object], default: [] })
  comments: Array<{
    id: string;
    authorId: string;
    authorName: string;
    authorRole: string;
    content: string;
    createdAt: Date;
    isPrivate: boolean;
  }>;
}

export const SubmissionSchema = SchemaFactory.createForClass(Submission);

// Indexes
SubmissionSchema.index({ assignmentId: 1, studentId: 1, attemptNumber: 1 }, { unique: true });
SubmissionSchema.index({ courseId: 1, studentId: 1 });
SubmissionSchema.index({ status: 1, submittedAt: 1 });
SubmissionSchema.index({ assignmentId: 1, status: 1 });
SubmissionSchema.index({ groupId: 1 });
