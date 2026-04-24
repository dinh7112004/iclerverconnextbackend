import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { HealthService } from './health.service';
import { CreateHealthNoteDto } from './dto/create-health-note.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('health')
@Controller('health')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  // --- NOTES ---
  @Get('notes/student/:studentId')
  @ApiOperation({ summary: "Get all health notes for a student" })
  async findAllNotes(@Param('studentId', ParseUUIDPipe) studentId: string) {
    const data = await this.healthService.findAllByStudent(studentId);
    return { data };
  }

  @Post('notes')
  @ApiOperation({ summary: "Create a new health note" })
  async createNote(@Body() createDto: CreateHealthNoteDto) {
    const data = await this.healthService.create(createDto);
    return { data };
  }

  @Delete('notes/:id')
  @ApiOperation({ summary: "Delete a health note" })
  async removeNote(@Param('id', ParseUUIDPipe) id: string) {
    await this.healthService.remove(id);
    return { message: 'Note deleted successfully' };
  }

  @Get('notice')
  @ApiOperation({ summary: "Get school health notice" })
  async getNotice() {
    const data = await this.healthService.getSchoolNotice();
    return { data };
  }

  // --- MEDICINES ---
  @Get('medicines')
  @ApiOperation({ summary: "Get all medicine instructions for a student" })
  async findAllMedicines(@Query('studentId', ParseUUIDPipe) studentId: string) {
    const data = await this.healthService.findAllMedicinesByStudent(studentId);
    return { data };
  }

  @Post('medicines')
  @ApiOperation({ summary: "Create a new medicine instruction" })
  async createMedicine(@Body() data: any) {
    const response = await this.healthService.createMedicine(data);
    return { data: response };
  }
}
