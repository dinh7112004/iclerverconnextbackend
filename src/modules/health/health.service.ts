import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HealthNote, HealthNoteType } from './entities/health-note.entity';
import { CreateHealthNoteDto } from './dto/create-health-note.dto';
import { Student } from '../students/entities/student.entity';
import { MedicineInstruction } from './entities/medicine-instruction.entity';

@Injectable()
export class HealthService implements OnModuleInit {
  constructor(
    @InjectRepository(HealthNote)
    private healthNoteRepository: Repository<HealthNote>,
    @InjectRepository(Student)
    private studentRepository: Repository<Student>,
    @InjectRepository(MedicineInstruction)
    private medicineRepository: Repository<MedicineInstruction>,
  ) {}

  async onModuleInit() {
    try {
      // Seed data for the first student
      const students = await this.studentRepository.find({ 
        order: { createdAt: 'ASC' }, 
        take: 1 
      });
      const student = students[0];
      
      if (student) {
        const studentId = student.id;
        
        // 1. Seed Health Notes
        const noteCount = await this.healthNoteRepository.count({ where: { studentId } });
        if (noteCount === 0) {
          await this.healthNoteRepository.save([
            {
              studentId,
              type: HealthNoteType.ALLERGY,
              title: 'DỊ ỨNG',
              content: 'Cháu bị dị ứng với tôm và các loại hải sản vỏ cứng. Xin nhà trường lưu ý bữa ăn bán trú.',
              isImportant: true,
              createdAt: new Date('2023-09-05T00:00:00Z'),
            },
            {
              studentId,
              type: HealthNoteType.HEALTH,
              title: 'SỨC KHỎE',
              content: 'Cháu hay bị chảy máu cam khi vận động mạnh dưới trời nắng.',
              isImportant: false,
              createdAt: new Date('2023-09-10T00:00:00Z'),
            },
          ]);
          console.log(`🚀 [HealthService] Seeded notes for ${student.fullName}`);
        }

        // 2. Seed Medicine Instructions
        const medCount = await this.medicineRepository.count({ where: { studentId } });
        if (medCount === 0) {
          await this.medicineRepository.save([
            {
              studentId,
              name: 'Siro Ho Prospan',
              dosage: '5ml',
              time: '08:00 AM',
              note: 'Uống sau khi ăn sáng. Nhờ cô giáo theo dõi nếu cháu ho nhiều hơn.',
              date: new Date().toISOString().split('T')[0],
              status: 'Chờ uống',
            },
            {
              studentId,
              name: 'Efferalgan 250mg',
              dosage: '1 gói',
              time: '11:30 AM',
              note: 'Chỉ uống nếu cháu sốt trên 38.5 độ.',
              date: new Date().toISOString().split('T')[0],
              status: 'Đã uống',
            },
          ]);
          console.log(`🚀 [HealthService] Seeded medicines for ${student.fullName}`);
        }
      }
    } catch (e) {
      console.error('Error seeding health data:', e);
    }
  }

  // Notes API
  async findAllByStudent(studentId: string): Promise<HealthNote[]> {
    return this.healthNoteRepository.find({
      where: { studentId },
      order: { isImportant: 'DESC', createdAt: 'DESC' },
    });
  }

  async create(createDto: CreateHealthNoteDto): Promise<HealthNote> {
    const note = this.healthNoteRepository.create(createDto);
    const saved = await this.healthNoteRepository.save(note);
    // Fetch the full record back from DB just to be absolutely sure all fields are present
    return this.healthNoteRepository.findOne({ where: { id: saved.id } });
  }

  async remove(id: string): Promise<void> {
    const result = await this.healthNoteRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Health note with ID ${id} not found`);
    }
  }

  // Medicines API
  async findAllMedicinesByStudent(studentId: string): Promise<MedicineInstruction[]> {
    return this.medicineRepository.find({
      where: { studentId },
      order: { date: 'DESC', createdAt: 'DESC' },
    });
  }

  async createMedicine(data: any): Promise<MedicineInstruction> {
    const instruction = this.medicineRepository.create(data as MedicineInstruction);
    return this.medicineRepository.save(instruction) as any;
  }

  async getSchoolNotice() {
    return {
      title: 'Lưu ý từ nhà trường',
      content: 'Các thông tin sức khỏe quý phụ huynh cung cấp sẽ được bảo mật và chỉ chia sẻ với GVCN và bộ phận Y tế nhà trường để đảm bảo an toàn cho học sinh.'
    };
  }
}
