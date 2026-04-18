import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SubjectsService } from './subjects.service';

@ApiTags('Subjects')
@Controller('subjects')
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách môn học' })
  async getAllSubjects(@Query('gradeLevel') gradeLevel?: number) {
    return this.subjectsService.findAll(gradeLevel); 
  }

}
