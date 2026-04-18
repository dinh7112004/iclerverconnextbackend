import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HealthNote } from './entities/health-note.entity';
import { CreateHealthNoteDto } from './dto/create-health-note.dto';

@Injectable()
export class HealthService {
  constructor(
    @InjectRepository(HealthNote)
    private healthNoteRepository: Repository<HealthNote>,
  ) {}

  async findAllByStudent(studentId: string): Promise<HealthNote[]> {
    return this.healthNoteRepository.find({
      where: { studentId },
      order: { isImportant: 'DESC', createdAt: 'DESC' },
    });
  }

  async create(createDto: CreateHealthNoteDto): Promise<HealthNote> {
    const note = this.healthNoteRepository.create(createDto);
    return this.healthNoteRepository.save(note);
  }

  async remove(id: string): Promise<void> {
    const result = await this.healthNoteRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Health note with ID ${id} not found`);
    }
  }

  async getSchoolNotice() {
    // This is a placeholder for a school-wide notice. 
    // In a real app, this might come from a GlobalSettings or a specific Notice entity.
    return {
      title: 'Thông báo y tế nhà trường',
      content: 'Nhà trường đang triển khai đợt khám sức khỏe định kỳ. Phụ huynh vui lòng cập nhật thông tin về các loại dị ứng và bệnh lý của học sinh lên ứng dụng để giáo viên và cán bộ y tế có thể hỗ trợ tốt nhất.'
    };
  }
}
