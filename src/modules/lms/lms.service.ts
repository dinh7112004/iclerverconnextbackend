import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectRepository } from '@nestjs/typeorm';
import { Model } from 'mongoose';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import {
  Course,
  Lesson,
  StudentProgress,
  CourseStatus,
  ProgressStatus,
} from './entities/course.entity';
import {
  Assignment,
  Submission,
  AssignmentStatus,
  SubmissionStatus,
} from './entities/assignment.entity';
import {
  Quiz,
  QuizAttempt,
  QuizStatus,
  AttemptStatus,
  QuestionType,
} from './entities/quiz.entity';

@Injectable()
export class LMSService {
  private readonly logger = new Logger(LMSService.name);

  constructor(
    @InjectModel(Course.name) private courseModel: Model<Course>,
    @InjectModel(Lesson.name) private lessonModel: Model<Lesson>,
    @InjectModel(StudentProgress.name) private progressModel: Model<StudentProgress>,
    @InjectModel(Assignment.name) private assignmentModel: Model<Assignment>,
    @InjectModel(Submission.name) private submissionModel: Model<Submission>,
    @InjectModel(Quiz.name) private quizModel: Model<Quiz>,
    @InjectModel(QuizAttempt.name) private attemptModel: Model<QuizAttempt>,
    @InjectRepository(User) private userRepository: Repository<User>,
  ) {}

  // ==================== COURSE MANAGEMENT ====================

  async createCourse(data: {
    code: string;
    name: string;
    description: string;
    subjectId: string;
    subjectName: string;
    teacherId: string;
    teacherName: string;
    academicYear: string;
    semester: string;
    createdBy: string;
    startDate?: Date;
    endDate?: Date;
    difficulty?: string;
    learningObjectives?: string[];
    prerequisites?: string[];
  }): Promise<Course> {
    const existing = await this.courseModel.findOne({ code: data.code });
    if (existing) {
      throw new BadRequestException('Mã khóa học đã tồn tại');
    }

    const course = await this.courseModel.create({
      ...data,
      status: CourseStatus.DRAFT,
      enrollmentCount: 0,
      totalLessons: 0,
      totalAssignments: 0,
      totalQuizzes: 0,
    });

    this.logger.log(`Created course: ${course.code}`);
    return course;
  }

  async updateCourse(
    courseId: string,
    data: {
      name?: string;
      description?: string;
      status?: CourseStatus;
      difficulty?: string;
      learningObjectives?: string[];
      startDate?: Date;
      endDate?: Date;
      updatedBy: string;
    },
  ): Promise<Course> {
    const course = await this.getCourse(courseId);

    Object.assign(course, data);
    course.lastUpdatedBy = data.updatedBy;

    await course.save();
    this.logger.log(`Updated course: ${courseId}`);

    return course;
  }

  async getCourse(courseId: string): Promise<Course> {
    const course = await this.courseModel.findById(courseId);
    if (!course) {
      throw new NotFoundException('Khóa học không tồn tại');
    }
    return course;
  }

  async getAllCourses(filters: {
    teacherId?: string;
    academicYear?: string;
    semester?: string;
    status?: CourseStatus;
    subjectId?: string;
    classId?: string;
    gradeLevel?: number;
  }) {
    const query: any = {};
    if (filters.teacherId) query.teacherId = filters.teacherId;
    if (filters.academicYear) query.academicYear = filters.academicYear;
    if (filters.semester) query.semester = filters.semester;
    if (filters.status) query.status = filters.status;
    if (filters.subjectId) query.subjectId = filters.subjectId;
    if (filters.gradeLevel) query.gradeLevel = Number(filters.gradeLevel);
    
    // Lọc theo lớp học nếu có
    if (filters.classId) {
      query.classIds = { $in: [filters.classId] };
    }

    return this.courseModel.find(query).sort({ createdAt: -1 });
  }


  async deleteCourse(courseId: string): Promise<boolean> {
    const course = await this.getCourse(courseId);

    // Check if has enrollments
    if (course.enrollmentCount > 0) {
      throw new BadRequestException('Không thể xóa khóa học đã có học sinh đăng ký');
    }

    // Delete all related data
    await Promise.all([
      this.lessonModel.deleteMany({ courseId }),
      this.assignmentModel.deleteMany({ courseId }),
      this.quizModel.deleteMany({ courseId }),
    ]);

    await this.courseModel.deleteOne({ _id: courseId });
    this.logger.log(`Deleted course: ${courseId}`);

    return true;
  }

  async publishCourse(courseId: string): Promise<Course> {
    const course = await this.getCourse(courseId);

    if (course.totalLessons === 0) {
      throw new BadRequestException('Khóa học phải có ít nhất 1 bài học');
    }

    course.status = CourseStatus.PUBLISHED;
    await course.save();

    this.logger.log(`Published course: ${courseId}`);
    return course;
  }

  async enrollStudent(data: {
    courseId: string;
    studentId: string;
    studentName: string;
    enrollmentKey?: string;
  }): Promise<StudentProgress> {
    const course = await this.getCourse(data.courseId);

    if (course.status !== CourseStatus.PUBLISHED) {
      throw new BadRequestException('Khóa học chưa được công khai');
    }

    if (!course.allowSelfEnrollment && data.enrollmentKey !== course.enrollmentKey) {
      throw new BadRequestException('Mã đăng ký không hợp lệ');
    }

    // Check if already enrolled
    const existing = await this.progressModel.findOne({
      studentId: data.studentId,
      courseId: data.courseId,
    });

    if (existing) {
      throw new BadRequestException('Học sinh đã đăng ký khóa học này');
    }

    const progress = await this.progressModel.create({
      studentId: data.studentId,
      studentName: data.studentName,
      courseId: data.courseId,
      courseName: course.name,
      enrolledAt: new Date(),
      status: ProgressStatus.NOT_STARTED,
      progressPercentage: 0,
      overallScore: 0,
      totalTimeSpent: 0,
    });

    // Update course enrollment count
    course.enrollmentCount += 1;
    if (!course.studentIds.includes(data.studentId)) {
      course.studentIds.push(data.studentId);
    }
    await course.save();

    this.logger.log(`Student ${data.studentId} enrolled in course ${data.courseId}`);
    return progress;
  }

  async unenrollStudent(courseId: string, studentId: string): Promise<boolean> {
    const progress = await this.progressModel.findOne({ courseId, studentId });
    if (!progress) {
      throw new NotFoundException('Không tìm thấy đăng ký');
    }

    await this.progressModel.deleteOne({ _id: progress._id });

    // Update course enrollment count
    const course = await this.getCourse(courseId);
    course.enrollmentCount = Math.max(0, course.enrollmentCount - 1);
    course.studentIds = course.studentIds.filter((id) => id !== studentId);
    await course.save();

    this.logger.log(`Student ${studentId} unenrolled from course ${courseId}`);
    return true;
  }

  // ==================== LESSON MANAGEMENT ====================

  async createLesson(data: {
    courseId: string;
    title: string;
    description?: string;
    order: number;
    moduleId?: string;
    moduleName?: string;
    estimatedMinutes?: number;
    createdBy: string;
  }): Promise<Lesson> {
    const course = await this.getCourse(data.courseId);

    const lesson = await this.lessonModel.create({
      ...data,
      isPublished: false,
      contents: [],
      resources: [],
      viewCount: 0,
      completionCount: 0,
    });

    // Update course stats
    course.totalLessons += 1;
    await course.save();

    this.logger.log(`Created lesson: ${lesson._id} for course ${data.courseId}`);
    return lesson;
  }

  async updateLesson(
    lessonId: string,
    data: {
      title?: string;
      description?: string;
      order?: number;
      isPublished?: boolean;
      contents?: any[];
      resources?: any[];
      liveSession?: any;
      updatedBy: string;
    },
  ): Promise<Lesson> {
    const lesson = await this.lessonModel.findById(lessonId);
    if (!lesson) {
      throw new NotFoundException('Bài học không tồn tại');
    }

    Object.assign(lesson, data);
    lesson.lastUpdatedBy = data.updatedBy;

    await lesson.save();
    this.logger.log(`Updated lesson: ${lessonId}`);

    return lesson;
  }

  async getLessons(courseId: string) {
    return this.lessonModel.find({ courseId }).sort({ order: 1 });
  }

  async getLessonById(lessonId: string): Promise<Lesson> {
    const lesson = await this.lessonModel.findById(lessonId);
    if (!lesson) {
      throw new NotFoundException('Bài học không tồn tại');
    }
    return lesson;
  }

  async deleteLesson(lessonId: string): Promise<boolean> {
    const lesson = await this.lessonModel.findById(lessonId);
    if (!lesson) {
      throw new NotFoundException('Bài học không tồn tại');
    }

    const course = await this.getCourse(lesson.courseId);
    course.totalLessons = Math.max(0, course.totalLessons - 1);
    await course.save();

    await this.lessonModel.deleteOne({ _id: lessonId });
    this.logger.log(`Deleted lesson: ${lessonId}`);

    return true;
  }

  async recordLessonProgress(data: {
    studentId: string;
    courseId: string;
    lessonId: string;
    lessonTitle: string;
    timeSpent: number;
    completedContents?: string[];
    lastPosition?: number;
  }): Promise<StudentProgress> {
    const progress = await this.progressModel.findOne({
      studentId: data.studentId,
      courseId: data.courseId,
    });

    if (!progress) {
      throw new NotFoundException('Không tìm thấy đăng ký khóa học');
    }

    const lessonIdx = progress.lessonProgress.findIndex((lp) => lp.lessonId === data.lessonId);

    const lessonProgress = {
      lessonId: data.lessonId,
      lessonTitle: data.lessonTitle,
      status: ProgressStatus.IN_PROGRESS,
      timeSpent: data.timeSpent,
      completedContents: data.completedContents || [],
      lastPosition: data.lastPosition,
    };

    if (lessonIdx >= 0) {
      progress.lessonProgress[lessonIdx] = {
        ...progress.lessonProgress[lessonIdx],
        ...lessonProgress,
        timeSpent: progress.lessonProgress[lessonIdx].timeSpent + data.timeSpent,
      };
    } else {
      progress.lessonProgress.push({
        ...lessonProgress,
        startedAt: new Date(),
      } as any);
    }

    progress.totalTimeSpent += data.timeSpent;
    progress.lastAccessedAt = new Date();
    progress.status = ProgressStatus.IN_PROGRESS;

    await progress.save();
    await this.updateProgressPercentage(progress._id.toString());

    return progress;
  }

  async completLesson(studentId: string, courseId: string, lessonId: string): Promise<StudentProgress> {
    const progress = await this.progressModel.findOne({ studentId, courseId });
    if (!progress) {
      throw new NotFoundException('Không tìm thấy đăng ký khóa học');
    }

    const lessonIdx = progress.lessonProgress.findIndex((lp) => lp.lessonId === lessonId);
    if (lessonIdx >= 0) {
      progress.lessonProgress[lessonIdx].status = ProgressStatus.COMPLETED;
      progress.lessonProgress[lessonIdx].completedAt = new Date();
    }

    await progress.save();
    await this.updateProgressPercentage(progress._id.toString());

    // Update lesson stats
    const lesson = await this.lessonModel.findById(lessonId);
    if (lesson) {
      lesson.completionCount += 1;
      await lesson.save();
    }

    return progress;
  }

  // ==================== ASSIGNMENT MANAGEMENT ====================

  async createAssignment(data: {
    courseId: string;
    lessonId?: string;
    title: string;
    description?: string;
    type?: string;
    maxScore: number;
    dueDate: Date;
    createdBy: string;
    allowedSubmissionTypes?: string[];
    rubric?: any;
  }): Promise<Assignment> {
    const course = await this.getCourse(data.courseId);

    const assignment = await this.assignmentModel.create({
      ...data,
      courseName: course.name,
      status: AssignmentStatus.DRAFT,
      submissionCount: 0,
      gradedCount: 0,
      averageScore: 0,
    });

    // Update course stats
    course.totalAssignments += 1;
    await course.save();

    this.logger.log(`Created assignment: ${assignment._id}`);
    return assignment;
  }

  async publishAssignment(assignmentId: string): Promise<Assignment> {
    const assignment = await this.assignmentModel.findById(assignmentId);
    if (!assignment) {
      throw new NotFoundException('Bài tập không tồn tại');
    }

    assignment.status = AssignmentStatus.PUBLISHED;
    await assignment.save();

    this.logger.log(`Published assignment: ${assignmentId}`);
    return assignment;
  }

  async submitAssignment(data: {
    assignmentId: string;
    studentId: string;
    studentName: string;
    files?: any[];
    textContent?: string;
    linkUrl?: string;
    codeContent?: string;
    codeLanguage?: string;
  }): Promise<Submission> {
    const assignment = await this.assignmentModel.findById(data.assignmentId);
    if (!assignment) {
      throw new NotFoundException('Bài tập không tồn tại');
    }

    if (assignment.status !== AssignmentStatus.PUBLISHED) {
      throw new BadRequestException('Bài tập chưa được công khai');
    }

    // Check if due
    const now = new Date();
    const isLate = now > assignment.dueDate;

    if (isLate && !assignment.allowLateSubmission) {
      throw new BadRequestException('Đã hết hạn nộp bài');
    }

    // Get current attempt number
    const existingSubmissions = await this.submissionModel.countDocuments({
      assignmentId: data.assignmentId,
      studentId: data.studentId,
    });

    if (existingSubmissions >= assignment.maxAttempts && assignment.maxAttempts > 0) {
      throw new BadRequestException('Đã hết số lần nộp bài');
    }

    const submission = await this.submissionModel.create({
      assignmentId: data.assignmentId,
      assignmentTitle: assignment.title,
      courseId: assignment.courseId,
      studentId: data.studentId,
      studentName: data.studentName,
      attemptNumber: existingSubmissions + 1,
      status: SubmissionStatus.SUBMITTED,
      submittedAt: now,
      isLate,
      files: data.files || [],
      textContent: data.textContent,
      linkUrl: data.linkUrl,
      codeContent: data.codeContent,
      codeLanguage: data.codeLanguage,
      maxScore: assignment.maxScore,
    });

    // Update assignment stats
    assignment.submissionCount += 1;
    await assignment.save();

    // If auto-grading enabled, trigger it
    if (assignment.enableAutoGrading && assignment.autoGradingTemplateId) {
      // TODO: Integrate with AutoGradingService
      this.logger.log(`Auto-grading triggered for submission ${submission._id}`);
    }

    this.logger.log(`Submission created: ${submission._id}`);
    return submission;
  }

  async gradeSubmission(
    submissionId: string,
    data: {
      score: number;
      feedback?: string;
      rubricScores?: any[];
      gradedBy: string;
    },
  ): Promise<Submission> {
    const submission = await this.submissionModel.findById(submissionId);
    if (!submission) {
      throw new NotFoundException('Bài nộp không tồn tại');
    }

    submission.score = data.score;
    submission.percentage = (data.score / submission.maxScore) * 100;
    submission.feedback = data.feedback;
    submission.rubricScores = data.rubricScores || [];
    submission.gradedBy = data.gradedBy;
    submission.gradedAt = new Date();
    submission.status = SubmissionStatus.GRADED;

    // Calculate letter grade
    submission.letterGrade = this.calculateLetterGrade(submission.percentage);

    await submission.save();

    // Update assignment stats
    const assignment = await this.assignmentModel.findById(submission.assignmentId);
    if (assignment) {
      assignment.gradedCount += 1;

      // Recalculate average score
      const allSubmissions = await this.submissionModel.find({
        assignmentId: submission.assignmentId,
        status: SubmissionStatus.GRADED,
      });
      const totalScore = allSubmissions.reduce((sum, s) => sum + (s.score || 0), 0);
      assignment.averageScore = totalScore / allSubmissions.length;

      await assignment.save();
    }

    // Update student progress
    await this.updateStudentAssignmentScore(
      submission.courseId,
      submission.studentId,
      submission.assignmentId,
      submission.assignmentTitle,
      data.score,
      submission.maxScore,
    );

    this.logger.log(`Graded submission: ${submissionId}`);
    return submission;
  }

  // ==================== QUIZ MANAGEMENT ====================

  async createQuiz(data: {
    courseId: string;
    lessonId?: string;
    title: string;
    description?: string;
    type?: string;
    questions: any[];
    timeLimit?: number;
    dueDate?: Date;
    createdBy: string;
  }): Promise<Quiz> {
    const course = await this.getCourse(data.courseId);

    const quiz = await this.quizModel.create({
      ...data,
      courseName: course.name,
      status: QuizStatus.DRAFT,
      attemptCount: 0,
      averageScore: 0,
    });

    // Update course stats
    course.totalQuizzes += 1;
    await course.save();

    this.logger.log(`Created quiz: ${quiz._id}`);
    return quiz;
  }

  async publishQuiz(quizId: string): Promise<Quiz> {
    const quiz = await this.quizModel.findById(quizId);
    if (!quiz) {
      throw new NotFoundException('Bài kiểm tra không tồn tại');
    }

    if (quiz.questions.length === 0) {
      throw new BadRequestException('Bài kiểm tra phải có ít nhất 1 câu hỏi');
    }

    quiz.status = QuizStatus.PUBLISHED;
    await quiz.save();

    this.logger.log(`Published quiz: ${quizId}`);
    return quiz;
  }

  async getQuizByLesson(lessonId: string): Promise<Quiz[]> {
    return this.quizModel.find({ lessonId, status: QuizStatus.PUBLISHED });
  }

  async startQuizAttempt(data: {
    quizId: string;
    studentId: string;
    studentName: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<QuizAttempt> {
    const quiz = await this.quizModel.findById(data.quizId);
    if (!quiz) {
      throw new NotFoundException('Bài kiểm tra không tồn tại');
    }

    if (quiz.status !== QuizStatus.PUBLISHED) {
      throw new BadRequestException('Bài kiểm tra chưa được công khai');
    }

    // Check attempts
    const existingAttempts = await this.attemptModel.countDocuments({
      quizId: data.quizId,
      studentId: data.studentId,
    });

    if (quiz.maxAttempts > 0 && existingAttempts >= quiz.maxAttempts) {
      throw new BadRequestException('Đã hết số lần làm bài');
    }

    const attempt = await this.attemptModel.create({
      quizId: data.quizId,
      quizTitle: quiz.title,
      courseId: quiz.courseId,
      studentId: data.studentId,
      studentName: data.studentName,
      attemptNumber: existingAttempts + 1,
      status: AttemptStatus.IN_PROGRESS,
      startedAt: new Date(),
      timeRemaining: quiz.timeLimit ? quiz.timeLimit * 60 : null,
      maxScore: quiz.totalPoints,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      answers: [],
    });

    this.logger.log(`Started quiz attempt: ${attempt._id}`);
    return attempt;
  }

  async submitQuizAttempt(
    attemptId: string,
    answers: Array<{
      questionId: string;
      answer: any;
    }>,
  ): Promise<QuizAttempt> {
    const attempt = await this.attemptModel.findById(attemptId);
    if (!attempt) {
      throw new NotFoundException('Lượt làm bài không tồn tại');
    }

    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new BadRequestException('Lượt làm bài đã kết thúc');
    }

    const quiz = await this.quizModel.findById(attempt.quizId);
    if (!quiz) {
      throw new NotFoundException('Bài kiểm tra không tồn tại');
    }

    // Grade the attempt
    let totalScore = 0;
    const gradedAnswers = [];

    for (const answer of answers) {
      const question = quiz.questions.find((q) => q.id === answer.questionId);
      if (!question) continue;

      const gradeResult = this.gradeQuizQuestion(question, answer.answer);

      gradedAnswers.push({
        questionId: answer.questionId,
        questionType: question.type,
        answer: answer.answer,
        isCorrect: gradeResult.isCorrect,
        pointsEarned: gradeResult.pointsEarned,
        feedback: gradeResult.feedback,
        answeredAt: new Date(),
      });

      totalScore += gradeResult.pointsEarned;
    }

    attempt.answers = gradedAnswers;
    attempt.score = totalScore;
    attempt.percentage = (totalScore / attempt.maxScore) * 100;
    attempt.passed = attempt.percentage >= ((quiz.passingScore / quiz.totalPoints) * 100);
    attempt.status = AttemptStatus.GRADED;
    attempt.submittedAt = new Date();
    attempt.timeSpent = Math.floor((attempt.submittedAt.getTime() - attempt.startedAt.getTime()) / 1000);
    attempt.isAutoGraded = true;

    await attempt.save();

    // --- TÍNH TOÁN PHẦN THƯỞNG ---
    // Tính trước để đảm bảo UI luôn có data dù DB gặp lỗi
    const pointsAwarded = gradedAnswers.filter(a => a.isCorrect).length * 10;
    let coinsAwarded = 0;
    if (attempt.percentage === 100) {
      coinsAwarded = 4;
    } else if (attempt.percentage >= 50) {
      coinsAwarded = 2;
    }
    
    let rewards = { points: pointsAwarded, coins: coinsAwarded };

    // --- CẬP NHẬT DATABASE (POSTGRES) ---
    try {
      this.logger.debug(`[Quiz] Searching user UUID in Postgres: ${attempt.studentId}`);
      const user = await this.userRepository.findOne({ where: { id: attempt.studentId } });
      
      if (user) {
        user.points = (user.points || 0) + pointsAwarded;
        user.coins = (user.coins || 0) + coinsAwarded;
        await this.userRepository.save(user);
        this.logger.log(`[Quiz] Updated Postgres for student ${user.id}: +${pointsAwarded} pts, +${coinsAwarded} coins`);
      } else {
        this.logger.warn(`[Quiz] User NOT found in Postgres with ID: ${attempt.studentId}. Skipping DB update but returning rewards to UI.`);
      }
    } catch (error) {
      this.logger.error(`[Quiz] Fatal error updating rewards in Postgres for ${attempt.studentId}: ${error.message}`);
    }


    // Gắn thêm giải thích của từng câu hỏi vào response
    (attempt as any).detailExplanations = gradedAnswers.map(ans => {
      const q = quiz.questions.find(quest => quest.id === ans.questionId);
      return {
        questionId: ans.questionId,
        explanation: q?.explanation || 'Không có giải thích chi tiết cho câu hỏi này.',
        correctAnswer: q?.options?.find(o => o.isCorrect)?.text || q?.correctAnswer || ''
      };
    });

    // Update quiz stats
    quiz.attemptCount += 1;
    const allAttempts = await this.attemptModel.find({
      quizId: quiz._id,
      status: AttemptStatus.GRADED,
    });
    const totalScores = allAttempts.reduce((sum, a) => sum + a.score, 0);
    quiz.averageScore = totalScores / (allAttempts.length || 1);
    quiz.highestScore = Math.max(...allAttempts.map((a) => a.score), 0);
    quiz.lowestScore = Math.min(...allAttempts.map((a) => a.score), 0);
    await quiz.save();

    // Update student progress
    await this.updateStudentQuizScore(
      attempt.courseId,
      attempt.studentId,
      attempt.quizId,
      quiz.title,
      totalScore,
      attempt.maxScore,
      attempt.attemptNumber,
    );

    this.logger.log(`Submitted quiz attempt: ${attemptId}, Score: ${totalScore}/${attempt.maxScore}`);

    // Convert to plain object to ensure dynamic fields are included in JSON response
    const result: any = attempt.toObject();
    result.rewards = rewards;
    result.detailExplanations = (attempt as any).detailExplanations;

    return result as any;
  }

  // ==================== HELPER METHODS ====================

  private gradeQuizQuestion(question: any, answer: any): {
    isCorrect: boolean;
    pointsEarned: number;
    feedback: string;
  } {
    switch (question.type) {
      case QuestionType.MULTIPLE_CHOICE:
      case QuestionType.TRUE_FALSE: {
        const correctOptions = question.options.filter((opt) => opt.isCorrect).map((opt) => opt.id);
        const selectedOptions = Array.isArray(answer) ? answer : [answer];
        const isCorrect =
          correctOptions.length === selectedOptions.length &&
          correctOptions.every((id) => selectedOptions.includes(id));

        return {
          isCorrect,
          pointsEarned: isCorrect ? question.points : 0,
          feedback: isCorrect ? 'Chính xác!' : 'Chưa chính xác',
        };
      }

      case QuestionType.SHORT_ANSWER: {
        const isCorrect =
          question.acceptedAnswers?.some((accepted) =>
            question.caseSensitive
              ? answer === accepted
              : answer.toLowerCase() === accepted.toLowerCase(),
          ) || false;

        return {
          isCorrect,
          pointsEarned: isCorrect ? question.points : 0,
          feedback: isCorrect ? 'Chính xác!' : 'Chưa chính xác',
        };
      }

      case QuestionType.FILL_IN_BLANK: {
        const answers = Array.isArray(answer) ? answer : [answer];
        let correctCount = 0;

        question.blanks?.forEach((blank, idx) => {
          if (blank.acceptedAnswers.includes(answers[idx])) {
            correctCount++;
          }
        });

        const percentage = correctCount / (question.blanks?.length || 1);
        return {
          isCorrect: percentage === 1,
          pointsEarned: question.points * percentage,
          feedback: `Điền đúng ${correctCount}/${question.blanks?.length || 0} chỗ trống`,
        };
      }

      case QuestionType.ESSAY:
        // Essay requires manual grading
        return {
          isCorrect: false,
          pointsEarned: 0,
          feedback: 'Đang chờ chấm điểm',
        };

      default:
        return {
          isCorrect: false,
          pointsEarned: 0,
          feedback: 'Loại câu hỏi không được hỗ trợ',
        };
    }
  }

  private calculateLetterGrade(percentage: number): string {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  }

  private async updateProgressPercentage(progressId: string): Promise<void> {
    const progress = await this.progressModel.findById(progressId);
    if (!progress) return;

    const course = await this.courseModel.findById(progress.courseId);
    if (!course) return;

    const totalItems = course.totalLessons + course.totalAssignments + course.totalQuizzes;
    if (totalItems === 0) return;

    const completedLessons = progress.lessonProgress.filter(
      (lp) => lp.status === ProgressStatus.COMPLETED,
    ).length;
    const completedAssignments = progress.assignmentScores.filter((as) => as.gradedAt).length;
    const completedQuizzes = progress.quizScores.length;

    const completedItems = completedLessons + completedAssignments + completedQuizzes;
    progress.progressPercentage = Math.round((completedItems / totalItems) * 100);

    if (progress.progressPercentage === 100) {
      progress.status = ProgressStatus.COMPLETED;
      progress.isCompleted = true;
      progress.completedAt = new Date();
    }

    await progress.save();
  }

  private async updateStudentAssignmentScore(
    courseId: string,
    studentId: string,
    assignmentId: string,
    assignmentTitle: string,
    score: number,
    maxScore: number,
  ): Promise<void> {
    const progress = await this.progressModel.findOne({ courseId, studentId });
    if (!progress) return;

    const assignmentIdx = progress.assignmentScores.findIndex((as) => as.assignmentId === assignmentId);

    const assignmentScore = {
      assignmentId,
      assignmentTitle,
      score,
      maxScore,
      gradedAt: new Date(),
    };

    if (assignmentIdx >= 0) {
      progress.assignmentScores[assignmentIdx] = assignmentScore as any;
    } else {
      progress.assignmentScores.push(assignmentScore as any);
    }

    await progress.save();
    await this.updateProgressPercentage(progress._id.toString());
  }

  private async updateStudentQuizScore(
    courseId: string,
    studentId: string,
    quizId: string,
    quizTitle: string,
    score: number,
    maxScore: number,
    attemptNumber: number,
  ): Promise<void> {
    const progress = await this.progressModel.findOne({ courseId, studentId });
    if (!progress) return;

    const quizIdx = progress.quizScores.findIndex((qs) => qs.quizId === quizId);

    if (quizIdx >= 0) {
      const existingQuiz = progress.quizScores[quizIdx];
      progress.quizScores[quizIdx] = {
        ...existingQuiz,
        score,
        maxScore,
        attempts: attemptNumber,
        bestScore: Math.max(existingQuiz.bestScore, score),
        lastAttemptAt: new Date(),
      } as any;
    } else {
      progress.quizScores.push({
        quizId,
        quizTitle,
        score,
        maxScore,
        attempts: attemptNumber,
        bestScore: score,
        lastAttemptAt: new Date(),
      } as any);
    }

    await progress.save();
    await this.updateProgressPercentage(progress._id.toString());
  }

  async getStudentProgress(studentId: string, courseId: string): Promise<StudentProgress> {
    const progress = await this.progressModel.findOne({ studentId, courseId });
    if (!progress) {
      throw new NotFoundException('Không tìm thấy tiến độ học tập');
    }
    return progress;
  }

  async getCourseAnalytics(courseId: string) {
    const course = await this.getCourse(courseId);

    const enrollments = await this.progressModel.find({ courseId });
    const completedEnrollments = enrollments.filter((e) => e.isCompleted);

    const assignments = await this.assignmentModel.find({ courseId });
    const submissions = await this.submissionModel.find({ courseId });

    const quizzes = await this.quizModel.find({ courseId });
    const attempts = await this.attemptModel.find({ courseId });

    return {
      course: {
        id: course._id,
        name: course.name,
        status: course.status,
        enrollmentCount: course.enrollmentCount,
      },
      enrollment: {
        total: enrollments.length,
        completed: completedEnrollments.length,
        completionRate: enrollments.length > 0 ? (completedEnrollments.length / enrollments.length) * 100 : 0,
        averageProgress: enrollments.reduce((sum, e) => sum + e.progressPercentage, 0) / (enrollments.length || 1),
      },
      assignments: {
        total: assignments.length,
        submissions: submissions.length,
        graded: submissions.filter((s) => s.status === SubmissionStatus.GRADED).length,
        averageScore: assignments.reduce((sum, a) => sum + a.averageScore, 0) / (assignments.length || 1),
      },
      quizzes: {
        total: quizzes.length,
        attempts: attempts.length,
        averageScore: quizzes.reduce((sum, q) => sum + q.averageScore, 0) / (quizzes.length || 1),
      },
    };
  }
}
