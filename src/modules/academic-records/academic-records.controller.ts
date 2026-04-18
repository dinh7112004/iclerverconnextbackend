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
import { AcademicRecordsService } from './academic-records.service';
import { CreateGradeDto } from './dto/create-grade.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';
import { BulkGradeDto } from './dto/bulk-grade.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/role.enum';
import { GradeType, Semester } from './entities/grade.entity';

@ApiTags('academic-records')
@Controller('academic-records')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AcademicRecordsController {
  constructor(
    private readonly academicRecordsService: AcademicRecordsService,
  ) {}

  @Post('grades')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Create a grade record' })
  @ApiResponse({ status: 201, description: 'Grade created successfully' })
  createGrade(
    @Body() createGradeDto: CreateGradeDto,
    @Request() req: any,
  ) {
    return this.academicRecordsService.create(
      createGradeDto,
      req.user?.id || 'system',
    );
  }

  @Post('grades/bulk')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Bulk create grade records for a class' })
  @ApiResponse({ status: 201, description: 'Grades created successfully' })
  bulkCreateGrades(@Body() bulkGradeDto: BulkGradeDto, @Request() req: any) {
    return this.academicRecordsService.bulkCreate(
      bulkGradeDto,
      req.user?.id || 'system',
    );
  }

  @Get('grades')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.TEACHER,
    UserRole.PARENT,
    UserRole.STUDENT,
  )
  @ApiOperation({ summary: 'Get grade records with filters' })
  @ApiQuery({ name: 'studentId', required: false, type: String })
  @ApiQuery({ name: 'classId', required: false, type: String })
  @ApiQuery({ name: 'subjectId', required: false, type: String })
  @ApiQuery({ name: 'academicYearId', required: false, type: String })
  @ApiQuery({ name: 'semester', required: false, enum: Semester })
  @ApiQuery({ name: 'gradeType', required: false, enum: GradeType })
  @ApiQuery({ name: 'isPublished', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Grade records retrieved' })
  findAllGrades(
    @Query('studentId') studentId?: string,
    @Query('classId') classId?: string,
    @Query('subjectId') subjectId?: string,
    @Query('academicYearId') academicYearId?: string,
    @Query('semester') semester?: Semester,
    @Query('gradeType') gradeType?: GradeType,
    @Query('isPublished') isPublished?: boolean,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.academicRecordsService.findAll({
      studentId,
      classId,
      subjectId,
      academicYearId,
      semester,
      gradeType,
      isPublished,
      page,
      limit,
    });
  }

  @Get('grades/student/:studentId/report')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.TEACHER,
    UserRole.PARENT,
    UserRole.STUDENT,
  )
  @ApiOperation({ summary: 'Get student grade report' })
  @ApiQuery({ name: 'academicYearId', required: true, type: String })
  @ApiQuery({ name: 'semester', required: true, enum: Semester })
  @ApiResponse({ status: 200, description: 'Student grade report retrieved' })
  getStudentReport(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Query('academicYearId') academicYearId: string,
    @Query('semester') semester: Semester,
  ) {
    return this.academicRecordsService.getStudentGradeReport(
      studentId,
      academicYearId,
      semester,
    );
  }

  @Get('grades/class/:classId/report')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.TEACHER,
  )
  @ApiOperation({ summary: 'Get class grade report for a subject' })
  @ApiQuery({ name: 'subjectId', required: true, type: String })
  @ApiQuery({ name: 'academicYearId', required: true, type: String })
  @ApiQuery({ name: 'semester', required: true, enum: Semester })
  @ApiResponse({ status: 200, description: 'Class grade report retrieved' })
  getClassReport(
    @Param('classId', ParseUUIDPipe) classId: string,
    @Query('subjectId') subjectId: string,
    @Query('academicYearId') academicYearId: string,
    @Query('semester') semester: Semester,
  ) {
    return this.academicRecordsService.getClassGradeReport(
      classId,
      subjectId,
      academicYearId,
      semester,
    );
  }

  @Get('grades/:id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.TEACHER,
    UserRole.PARENT,
    UserRole.STUDENT,
  )
  @ApiOperation({ summary: 'Get grade record by ID' })
  @ApiResponse({ status: 200, description: 'Grade record found' })
  @ApiResponse({ status: 404, description: 'Grade record not found' })
  findOneGrade(@Param('id', ParseUUIDPipe) id: string) {
    return this.academicRecordsService.findOne(id);
  }

  @Patch('grades/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Update grade record' })
  @ApiResponse({ status: 200, description: 'Grade updated successfully' })
  @ApiResponse({ status: 404, description: 'Grade record not found' })
  updateGrade(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateGradeDto: UpdateGradeDto,
    @Request() req: any,
  ) {
    return this.academicRecordsService.update(
      id,
      updateGradeDto,
      req.user?.id || 'system',
    );
  }

  @Post('grades/publish')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Publish grades to students and parents' })
  @ApiResponse({ status: 200, description: 'Grades published successfully' })
  publishGrades(@Body('gradeIds') gradeIds: string[]) {
    return this.academicRecordsService.publishGrades(gradeIds);
  }

  @Delete('grades/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Delete grade record' })
  @ApiResponse({ status: 200, description: 'Grade deleted successfully' })
  @ApiResponse({ status: 404, description: 'Grade record not found' })
  removeGrade(@Param('id', ParseUUIDPipe) id: string) {
    return this.academicRecordsService.remove(id);
  }
}
