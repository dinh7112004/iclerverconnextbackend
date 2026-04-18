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
  ParseBoolPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { SchoolsService } from './schools.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { CreateGradeDto } from './dto/create-grade.dto';
import { CreateAcademicYearDto } from './dto/create-academic-year.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/role.enum';

@ApiTags('schools')
@Controller('schools')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SchoolsController {
  constructor(private readonly schoolsService: SchoolsService) {}

  // School Endpoints
  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a new school' })
  @ApiResponse({ status: 201, description: 'School created successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 409, description: 'School code already exists' })
  createSchool(@Body() createSchoolDto: CreateSchoolDto) {
    return this.schoolsService.createSchool(createSchoolDto);
  }

  @Get()
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.SCHOOL_ADMIN,
    UserRole.PRINCIPAL,
    UserRole.VICE_PRINCIPAL,
  )
  @ApiOperation({ summary: 'Get all schools with pagination and filters' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'schoolType', required: false, type: String })
  @ApiQuery({ name: 'city', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Schools retrieved successfully' })
  findAllSchools(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('schoolType') schoolType?: string,
    @Query('city') city?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.schoolsService.findAllSchools({
      page,
      limit,
      schoolType,
      city,
      status,
      search,
    });
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
  @ApiOperation({ summary: 'Get school by ID' })
  @ApiResponse({ status: 200, description: 'School found' })
  @ApiResponse({ status: 404, description: 'School not found' })
  findOneSchool(@Param('id', ParseUUIDPipe) id: string) {
    return this.schoolsService.findOneSchool(id);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN)
  @ApiOperation({ summary: 'Update school' })
  @ApiResponse({ status: 200, description: 'School updated successfully' })
  @ApiResponse({ status: 404, description: 'School not found' })
  updateSchool(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSchoolDto: UpdateSchoolDto,
  ) {
    return this.schoolsService.updateSchool(id, updateSchoolDto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Deactivate school' })
  @ApiResponse({ status: 200, description: 'School deactivated successfully' })
  @ApiResponse({ status: 404, description: 'School not found' })
  removeSchool(@Param('id', ParseUUIDPipe) id: string) {
    return this.schoolsService.removeSchool(id);
  }

  // Grade Endpoints
  @Post('grades')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Create a new grade' })
  @ApiResponse({ status: 201, description: 'Grade created successfully' })
  @ApiResponse({ status: 409, description: 'Grade level already exists' })
  createGrade(@Body() createGradeDto: CreateGradeDto) {
    return this.schoolsService.createGrade(createGradeDto);
  }

  @Get('grades/list')
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
  @ApiOperation({ summary: 'Get all grades, optionally filtered by school' })
  @ApiQuery({ name: 'schoolId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Grades retrieved successfully' })
  findAllGrades(@Query('schoolId') schoolId?: string) {
    return this.schoolsService.findAllGrades(schoolId);
  }

  @Get('grades/:id')
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
  @ApiOperation({ summary: 'Get grade by ID' })
  @ApiResponse({ status: 200, description: 'Grade found' })
  @ApiResponse({ status: 404, description: 'Grade not found' })
  findOneGrade(@Param('id', ParseUUIDPipe) id: string) {
    return this.schoolsService.findOneGrade(id);
  }

  @Patch('grades/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Update grade' })
  @ApiResponse({ status: 200, description: 'Grade updated successfully' })
  @ApiResponse({ status: 404, description: 'Grade not found' })
  updateGrade(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateData: Partial<Omit<CreateGradeDto, 'schoolId'>>,
  ) {
    return this.schoolsService.updateGrade(id, updateData);
  }

  @Delete('grades/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Delete grade' })
  @ApiResponse({ status: 200, description: 'Grade deleted successfully' })
  @ApiResponse({ status: 404, description: 'Grade not found' })
  removeGrade(@Param('id', ParseUUIDPipe) id: string) {
    return this.schoolsService.removeGrade(id);
  }

  // Academic Year Endpoints
  @Post('academic-years')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Create a new academic year' })
  @ApiResponse({
    status: 201,
    description: 'Academic year created successfully',
  })
  @ApiResponse({
    status: 409,
    description: 'Academic year name already exists',
  })
  createAcademicYear(@Body() createAcademicYearDto: CreateAcademicYearDto) {
    return this.schoolsService.createAcademicYear(createAcademicYearDto);
  }

  @Get('academic-years/list')
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
  @ApiOperation({
    summary: 'Get all academic years, optionally filtered by school',
  })
  @ApiQuery({ name: 'schoolId', required: false, type: String })
  @ApiQuery({ name: 'isCurrent', required: false, type: Boolean })
  @ApiResponse({
    status: 200,
    description: 'Academic years retrieved successfully',
  })
  findAllAcademicYears(
    @Query('schoolId') schoolId?: string,
    @Query('isCurrent') isCurrent?: boolean,
  ) {
    return this.schoolsService.findAllAcademicYears(schoolId, isCurrent);
  }

  @Get('academic-years/current/:schoolId')
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
  @ApiOperation({ summary: 'Get current academic year for a school' })
  @ApiResponse({ status: 200, description: 'Current academic year found' })
  @ApiResponse({ status: 404, description: 'No current academic year set' })
  getCurrentAcademicYear(@Param('schoolId', ParseUUIDPipe) schoolId: string) {
    return this.schoolsService.getCurrentAcademicYear(schoolId);
  }

  @Get('academic-years/:id')
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
  @ApiOperation({ summary: 'Get academic year by ID' })
  @ApiResponse({ status: 200, description: 'Academic year found' })
  @ApiResponse({ status: 404, description: 'Academic year not found' })
  findOneAcademicYear(@Param('id', ParseUUIDPipe) id: string) {
    return this.schoolsService.findOneAcademicYear(id);
  }

  @Patch('academic-years/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Update academic year' })
  @ApiResponse({
    status: 200,
    description: 'Academic year updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Academic year not found' })
  updateAcademicYear(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateData: Partial<Omit<CreateAcademicYearDto, 'schoolId'>>,
  ) {
    return this.schoolsService.updateAcademicYear(id, updateData);
  }

  @Delete('academic-years/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.PRINCIPAL)
  @ApiOperation({ summary: 'Delete academic year' })
  @ApiResponse({
    status: 200,
    description: 'Academic year deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Academic year not found' })
  removeAcademicYear(@Param('id', ParseUUIDPipe) id: string) {
    return this.schoolsService.removeAcademicYear(id);
  }
  @Get('notice')
  @ApiOperation({ summary: 'Get school-wide notice' })
  @ApiResponse({ status: 200, description: 'Notice found' })
  getSchoolNotice() {
    return {
      data: {
        title: 'Thông báo y tế nhà trường',
        content: 'Nhà trường đang triển khai đợt khám sức khỏe định kỳ. Phụ huynh vui lòng cập nhật thông tin về các loại dị ứng và bệnh lý của học sinh lên ứng dụng để giáo viên và cán bộ y tế có thể hỗ trợ tốt nhất.'
      }
    };
  }
}
