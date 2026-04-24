import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Version,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LMSService } from './lms.service';
import {
  CourseStatus,
  ProgressStatus,
} from './entities/course.entity';
import {
  AssignmentStatus,
  SubmissionStatus,
} from './entities/assignment.entity';

@ApiTags('LMS')
@Controller('lms')
export class LMSController {
  constructor(private readonly lmsService: LMSService) {}

  // ==================== COURSE ENDPOINTS ====================

  @Post('courses')
  @ApiOperation({ summary: 'Tạo khóa học mới' })
  async createCourse(
    @Body()
    body: {
      code: string;
      name: string;
      description: string;
      subjectId: string;
      subjectName: string;
      teacherId: string;
      teacherName: string;
      academicYear: string;
      semester: string;
      startDate?: string;
      endDate?: string;
      difficulty?: string;
      learningObjectives?: string[];
      prerequisites?: string[];
    },
    @Req() req: any,
  ) {
    return this.lmsService.createCourse({
      ...body,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      createdBy: req.user?.id || 'system',
    });
  }

  @Get('courses')
  @ApiOperation({ summary: 'Lấy danh sách khóa học' })
  async getCourses(
    @Query('teacherId') teacherId?: string,
    @Query('academicYear') academicYear?: string,
    @Query('semester') semester?: string,
    @Query('status') status?: CourseStatus,
    @Query('subjectId') subjectId?: string,
    @Query('classId') classId?: string,
    @Query('gradeLevel') gradeLevel?: number,
  ) {
    return this.lmsService.getAllCourses({
      teacherId,
      academicYear,
      semester,
      status,
      subjectId,
      classId,
      gradeLevel,
    });
  }


  @Get('courses/:id')
  @ApiOperation({ summary: 'Lấy thông tin khóa học' })
  async getCourse(@Param('id') id: string) {
    return this.lmsService.getCourse(id);
  }

  @Put('courses/:id')
  @ApiOperation({ summary: 'Cập nhật khóa học' })
  async updateCourse(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      description?: string;
      status?: CourseStatus;
      difficulty?: string;
      learningObjectives?: string[];
      startDate?: string;
      endDate?: string;
    },
    @Req() req: any,
  ) {
    return this.lmsService.updateCourse(id, {
      ...body,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      updatedBy: req.user?.id || 'system',
    });
  }

  @Delete('courses/:id')
  @ApiOperation({ summary: 'Xóa khóa học' })
  async deleteCourse(@Param('id') id: string) {
    const result = await this.lmsService.deleteCourse(id);
    return { success: result };
  }

  @Post('courses/:id/publish')
  @ApiOperation({ summary: 'Công khai khóa học' })
  async publishCourse(@Param('id') id: string) {
    return this.lmsService.publishCourse(id);
  }

  @Post('courses/:id/enroll')
  @ApiOperation({ summary: 'Đăng ký khóa học' })
  async enrollCourse(
    @Param('id') courseId: string,
    @Body()
    body: {
      studentId: string;
      studentName: string;
      enrollmentKey?: string;
    },
  ) {
    return this.lmsService.enrollStudent({
      courseId,
      ...body,
    });
  }

  @Delete('courses/:courseId/enrollments/:studentId')
  @ApiOperation({ summary: 'Hủy đăng ký khóa học' })
  async unenrollCourse(
    @Param('courseId') courseId: string,
    @Param('studentId') studentId: string,
  ) {
    const result = await this.lmsService.unenrollStudent(courseId, studentId);
    return { success: result };
  }

  @Get('courses/:id/analytics')
  @ApiOperation({ summary: 'Thống kê khóa học' })
  async getCourseAnalytics(@Param('id') id: string) {
    return this.lmsService.getCourseAnalytics(id);
  }

  // ==================== LESSON ENDPOINTS ====================

  @Post('lessons')
  @ApiOperation({ summary: 'Tạo bài học mới' })
  async createLesson(
    @Body()
    body: {
      courseId: string;
      title: string;
      description?: string;
      order: number;
      moduleId?: string;
      moduleName?: string;
      estimatedMinutes?: number;
    },
    @Req() req: any,
  ) {
    return this.lmsService.createLesson({
      ...body,
      createdBy: req.user?.id || 'system',
    });
  }

  @Get('courses/:courseId/lessons')
  @ApiOperation({ summary: 'Lấy danh sách bài học của khóa học' })
  async getLessons(@Param('courseId') courseId: string) {
    return this.lmsService.getLessons(courseId);
  }

  @Get('lessons/:id')
  @ApiOperation({ summary: 'Lấy chi tiết một bài học' })
  async getLesson(@Param('id') id: string) {
    return this.lmsService.getLessonById(id);
  }

  @Put('lessons/:id')
  @ApiOperation({ summary: 'Cập nhật bài học' })
  async updateLesson(
    @Param('id') id: string,
    @Body()
    body: {
      title?: string;
      description?: string;
      order?: number;
      isPublished?: boolean;
      contents?: any[];
      resources?: any[];
      liveSession?: any;
    },
    @Req() req: any,
  ) {
    return this.lmsService.updateLesson(id, {
      ...body,
      updatedBy: req.user?.id || 'system',
    });
  }

  @Delete('lessons/:id')
  @ApiOperation({ summary: 'Xóa bài học' })
  async deleteLesson(@Param('id') id: string) {
    const result = await this.lmsService.deleteLesson(id);
    return { success: result };
  }

  @Post('lessons/:lessonId/progress')
  @ApiOperation({ summary: 'Ghi nhận tiến độ học bài' })
  async recordLessonProgress(
    @Param('lessonId') lessonId: string,
    @Body()
    body: {
      studentId: string;
      courseId: string;
      lessonTitle: string;
      timeSpent: number;
      completedContents?: string[];
      lastPosition?: number;
    },
  ) {
    return this.lmsService.recordLessonProgress({
      lessonId,
      ...body,
    });
  }

  @Post('lessons/:lessonId/complete')
  @ApiOperation({ summary: 'Đánh dấu hoàn thành bài học' })
  async completeLesson(
    @Param('lessonId') lessonId: string,
    @Body() body: { studentId: string; courseId: string },
  ) {
    return this.lmsService.completLesson(body.studentId, body.courseId, lessonId);
  }

  // ==================== ASSIGNMENT ENDPOINTS ====================

  @Get('assignments')
  @ApiOperation({ summary: 'Lấy danh sách bài tập của lớp' })
  async getAssignments(@Query('classId') classId: string) {
    const data = await this.lmsService.getAssignmentsByClass(classId);
    return {
      success: true,
      data: data
    };
  }

  @Get('submissions')
  @ApiOperation({ summary: 'Lấy danh sách bài nộp của học sinh' })
  async getSubmissions(@Query('studentId') studentId: string) {
    const data = await this.lmsService.getSubmissionsByStudent(studentId);
    return {
      success: true,
      data: data
    };
  }

  @Post('assignments')
  @ApiOperation({ summary: 'Tạo bài tập mới' })
  async createAssignment(
    @Body()
    body: {
      courseId: string;
      lessonId?: string;
      title: string;
      description?: string;
      type?: string;
      maxScore: number;
      dueDate: string;
      allowedSubmissionTypes?: string[];
      rubric?: any;
    },
    @Req() req: any,
  ) {
    return this.lmsService.createAssignment({
      ...body,
      dueDate: new Date(body.dueDate),
      createdBy: req.user?.id || 'system',
    });
  }

  @Post('assignments/:id/publish')
  @ApiOperation({ summary: 'Công khai bài tập' })
  async publishAssignment(@Param('id') id: string) {
    return this.lmsService.publishAssignment(id);
  }

  @Post('assignments/:id/submit')
  @ApiOperation({ summary: 'Nộp bài tập' })
  async submitAssignment(
    @Param('id') assignmentId: string,
    @Body()
    body: {
      studentId?: string;
      studentName?: string;
      files?: any[];
      textContent?: string;
      linkUrl?: string;
      codeContent?: string;
      codeLanguage?: string;
    },
    @Req() req: any,
  ) {
    let studentId = body.studentId;
    let studentName = body.studentName;

    // Nếu không có studentId trong body, tự động lấy từ user profile
    if (!studentId && req.user?.id) {
      const student = await this.lmsService.getStudentByUser(req.user.id);
      if (student) {
        studentId = student.id;
        studentName = student.fullName;
      }
    }

    if (!studentId) {
      throw new BadRequestException('Không tìm thấy thông tin học sinh');
    }

    return this.lmsService.submitAssignment({
      assignmentId,
      ...body,
      studentId,
      studentName,
    });
  }

  @Post('submissions/:id/grade')
  @ApiOperation({ summary: 'Chấm bài tập' })
  async gradeSubmission(
    @Param('id') submissionId: string,
    @Body()
    body: {
      score: number;
      feedback?: string;
      rubricScores?: any[];
    },
    @Req() req: any,
  ) {
    return this.lmsService.gradeSubmission(submissionId, {
      ...body,
      gradedBy: req.user?.id || 'system',
    });
  }

  // ==================== QUIZ ENDPOINTS ====================

  @Post('quizzes')
  @ApiOperation({ summary: 'Tạo bài kiểm tra mới' })
  async createQuiz(
    @Body()
    body: {
      courseId: string;
      lessonId?: string;
      title: string;
      description?: string;
      type?: string;
      questions: any[];
      timeLimit?: number;
      dueDate?: string;
    },
    @Req() req: any,
  ) {
    return this.lmsService.createQuiz({
      ...body,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      createdBy: req.user?.id || 'system',
    });
  }

  @Post('quizzes/:id/publish')
  @ApiOperation({ summary: 'Công khai bài kiểm tra' })
  async publishQuiz(@Param('id') id: string) {
    return this.lmsService.publishQuiz(id);
  }

  @Get('lessons/:lessonId/quizzes')
  @ApiOperation({ summary: 'Lấy bài kiểm tra của một bài học' })
  async getQuizByLesson(@Param('lessonId') lessonId: string) {
    return this.lmsService.getQuizByLesson(lessonId);
  }

  @Post('quizzes/:id/start')
  @ApiOperation({ summary: 'Bắt đầu làm bài kiểm tra' })
  async startQuiz(
    @Param('id') quizId: string,
    @Body()
    body: {
      studentId: string;
      studentName: string;
    },
    @Req() req: any,
  ) {
    return this.lmsService.startQuizAttempt({
      quizId,
      ...body,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('quiz-attempts/:id/submit')
  @ApiOperation({ summary: 'Nộp bài kiểm tra' })
  async submitQuiz(
    @Param('id') attemptId: string,
    @Body()
    body: {
      answers: Array<{
        questionId: string;
        answer: any;
      }>;
    },
  ) {
    return this.lmsService.submitQuizAttempt(attemptId, body.answers);
  }

  // ==================== STUDENT PROGRESS ENDPOINTS ====================

  @Get('progress/:studentId/courses/:courseId')
  @ApiOperation({ summary: 'Lấy tiến độ học tập của học sinh' })
  async getStudentProgress(
    @Param('studentId') studentId: string,
    @Param('courseId') courseId: string,
  ) {
    return this.lmsService.getStudentProgress(studentId, courseId);
  }
}
