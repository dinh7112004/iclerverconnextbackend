import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SurveysService } from './surveys.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('surveys')
@Controller('surveys')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SurveysController {
  constructor(private readonly surveysService: SurveysService) { }

  @Get()
  @ApiOperation({ summary: 'Get all surveys (ongoing and history)' })
  async findAll() {
    const data = await this.surveysService.findAll();
    return { data };
  }

  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit survey response' })
  async submit(@Param('id') id: string) {
    const data = await this.surveysService.submit(id);
    return { success: true, data };
  }
}
