import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseUUIDPipe,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { SchedulesService } from './schedules.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { CreateExamScheduleDto } from './dto/create-exam-schedule.dto';
import { BulkScheduleDto } from './dto/bulk-schedule.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/role.enum';
import { DayOfWeek, ScheduleType } from './entities/schedule.entity';
import { ExamType } from './entities/exam-schedule.entity';
import { Semester } from '../academic-records/entities/grade.entity';

@ApiTags('schedules')
@Controller('schedules')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  // ==================== SCHEDULES ====================

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Create a schedule' })
  @ApiResponse({ status: 201, description: 'Schedule created successfully' })
  createSchedule(
    @Body() createScheduleDto: CreateScheduleDto,
    @Request() req: any,
  ) {
    return this.schedulesService.createSchedule(
      createScheduleDto,
      req.user?.id || 'system',
    );
  }

  @Post('bulk')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Bulk create schedules for a class' })
  @ApiResponse({ status: 201, description: 'Schedules created successfully' })
  bulkCreateSchedules(
    @Body() bulkScheduleDto: BulkScheduleDto,
    @Request() req: any,
  ) {
    return this.schedulesService.bulkCreateSchedules(
      bulkScheduleDto,
      req.user?.id || 'system',
    );
  }

  @Get()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.TEACHER,
    UserRole.PARENT,
    UserRole.STUDENT,
  )
  @ApiOperation({ summary: 'Get schedules with filters' })
  @ApiQuery({ name: 'classId', required: false, type: String })
  @ApiQuery({ name: 'teacherId', required: false, type: String })
  @ApiQuery({ name: 'subjectId', required: false, type: String })
  @ApiQuery({ name: 'academicYearId', required: false, type: String })
  @ApiQuery({ name: 'semester', required: false, enum: Semester })
  @ApiQuery({ name: 'dayOfWeek', required: false, enum: DayOfWeek })
  @ApiQuery({ name: 'scheduleType', required: false, enum: ScheduleType })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Schedules retrieved' })
  findAllSchedules(
    @Query('classId') classId?: string,
    @Query('teacherId') teacherId?: string,
    @Query('subjectId') subjectId?: string,
    @Query('academicYearId') academicYearId?: string,
    @Query('semester') semester?: Semester,
    @Query('dayOfWeek') dayOfWeek?: DayOfWeek,
    @Query('scheduleType') scheduleType?: ScheduleType,
    @Query('isActive') isActive?: boolean,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.schedulesService.findAllSchedules({
      classId,
      teacherId,
      subjectId,
      academicYearId,
      semester,
      dayOfWeek,
      scheduleType,
      isActive,
      page,
      limit,
    });
  }

  @Get('class/:classId/timetable')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.TEACHER,
    UserRole.PARENT,
    UserRole.STUDENT,
  )
  @ApiOperation({ summary: 'Get class timetable' })
  @ApiQuery({ name: 'academicYearId', required: true, type: String })
  @ApiQuery({ name: 'semester', required: true, enum: Semester })
  @ApiResponse({ status: 200, description: 'Class timetable retrieved' })
  getClassTimetable(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Query('academicYearId') academicYearId: string,
    @Query('semester') semester: Semester,
  ) {
    return this.schedulesService.getClassTimetable(
      classId,
      academicYearId,
      semester,
    );
  }

  @Get('teacher/:teacherId/schedule')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
    UserRole.HOMEROOM_TEACHER,
  )
  @ApiOperation({ summary: 'Get teacher schedule' })
  @ApiQuery({ name: 'academicYearId', required: true, type: String })
  @ApiQuery({ name: 'semester', required: true, enum: Semester })
  @ApiResponse({ status: 200, description: 'Teacher schedule retrieved' })
  getTeacherSchedule(
    @Param('teacherId', ParseUUIDPipe) teacherId: string,
    @Query('academicYearId') academicYearId: string,
    @Query('semester') semester: Semester,
  ) {
    return this.schedulesService.getTeacherSchedule(
      teacherId,
      academicYearId,
      semester,
    );
  }

  @Get(':id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
    UserRole.HOMEROOM_TEACHER,
    UserRole.PARENT,
    UserRole.STUDENT,
  )
  @ApiOperation({ summary: 'Get schedule by ID' })
  @ApiResponse({ status: 200, description: 'Schedule found' })
  @ApiResponse({ status: 404, description: 'Schedule not found' })
  findOneSchedule(@Param('id', ParseUUIDPipe) id: string) {
    return this.schedulesService.findOneSchedule(id);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Update schedule' })
  @ApiResponse({ status: 200, description: 'Schedule updated successfully' })
  @ApiResponse({ status: 404, description: 'Schedule not found' })
  updateSchedule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateScheduleDto: UpdateScheduleDto,
    @Request() req: any,
  ) {
    return this.schedulesService.updateSchedule(
      id,
      updateScheduleDto,
      req.user?.id || 'system',
    );
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Delete schedule' })
  @ApiResponse({ status: 200, description: 'Schedule deleted successfully' })
  @ApiResponse({ status: 404, description: 'Schedule not found' })
  removeSchedule(@Param('id', ParseUUIDPipe) id: string) {
    return this.schedulesService.removeSchedule(id);
  }

  // ==================== EXAM SCHEDULES ====================

  @Post('exams')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Create an exam schedule' })
  @ApiResponse({ status: 201, description: 'Exam schedule created successfully' })
  createExamSchedule(
    @Body() createExamScheduleDto: CreateExamScheduleDto,
    @Request() req: any,
  ) {
    return this.schedulesService.createExamSchedule(
      createExamScheduleDto,
      req.user?.id || 'system',
    );
  }

  @Get('exams')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.TEACHER,
    UserRole.PARENT,
    UserRole.STUDENT,
  )
  @ApiOperation({ summary: 'Get exam schedules with filters' })
  @ApiQuery({ name: 'classId', required: false, type: String })
  @ApiQuery({ name: 'schoolId', required: false, type: String })
  @ApiQuery({ name: 'subjectId', required: false, type: String })
  @ApiQuery({ name: 'examType', required: false, enum: ExamType })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'isPublished', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Exam schedules retrieved' })
  findAllExamSchedules(
    @Query('classId') classId?: string,
    @Query('schoolId') schoolId?: string,
    @Query('subjectId') subjectId?: string,
    @Query('examType') examType?: ExamType,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('isPublished') isPublished?: boolean,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.schedulesService.findAllExamSchedules({
      classId,
      schoolId,
      subjectId,
      examType,
      startDate,
      endDate,
      isPublished,
      page,
      limit,
    });
  }

  @Get('exams/:id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.TEACHER,
    UserRole.PARENT,
    UserRole.STUDENT,
  )
  @ApiOperation({ summary: 'Get exam schedule by ID' })
  @ApiResponse({ status: 200, description: 'Exam schedule found' })
  @ApiResponse({ status: 404, description: 'Exam schedule not found' })
  findOneExamSchedule(@Param('id', ParseUUIDPipe) id: string) {
    return this.schedulesService.findOneExamSchedule(id);
  }

  @Patch('exams/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Update exam schedule' })
  @ApiResponse({ status: 200, description: 'Exam schedule updated successfully' })
  @ApiResponse({ status: 404, description: 'Exam schedule not found' })
  updateExamSchedule(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateExamScheduleDto: any,
    @Request() req: any,
  ) {
    return this.schedulesService.updateExamSchedule(
      id,
      updateExamScheduleDto,
      req.user?.id || 'system',
    );
  }

  @Post('exams/:id/publish')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Publish exam schedule' })
  @ApiResponse({ status: 200, description: 'Exam schedule published successfully' })
  publishExamSchedule(@Param('id', ParseUUIDPipe) id: string) {
    return this.schedulesService.publishExamSchedule(id);
  }

  @Delete('exams/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Delete exam schedule' })
  @ApiResponse({ status: 200, description: 'Exam schedule deleted successfully' })
  @ApiResponse({ status: 404, description: 'Exam schedule not found' })
  removeExamSchedule(@Param('id', ParseUUIDPipe) id: string) {
    return this.schedulesService.removeExamSchedule(id);
  }

  // ==================== TIME SLOTS ====================

  @Get('time-slots/:schoolId')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
    UserRole.TEACHER,
    UserRole.HOMEROOM_TEACHER,
    UserRole.PARENT,
    UserRole.STUDENT,
  )
  @ApiOperation({ summary: 'Get time slots for a school' })
  @ApiResponse({ status: 200, description: 'Time slots retrieved' })
  getTimeSlots(@Param('schoolId', ParseUUIDPipe) schoolId: string) {
    return this.schedulesService.getTimeSlots(schoolId);
  }
}
