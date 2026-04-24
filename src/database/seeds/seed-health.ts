import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HealthNote, HealthNoteType } from '../../modules/health/entities/health-note.entity';
import { Student } from '../../modules/students/entities/student.entity';
import { Logger } from '@nestjs/common';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const logger = new Logger('SeedHealth');

  const healthNoteRepo = app.get(getRepositoryToken(HealthNote));
  const studentRepo = app.get(getRepositoryToken(Student));

  // Tìm học sinh đang test
  const student = await studentRepo.findOne({ where: {}, order: { createdAt: 'ASC' } });
  
  if (!student) {
    logger.error('No student found to seed health data for.');
    await app.close();
    return;
  }

  const studentId = student.id;

  // Xóa các ghi chú cũ để nạp mới cho chuẩn
  await healthNoteRepo.delete({ studentId });

  // Nạp các ghi chú "Lưu ý sức khỏe" đúng như yêu cầu
  await healthNoteRepo.save([
    {
      studentId,
      type: HealthNoteType.ALLERGY,
      title: 'DỊ ỨNG',
      content: 'Cháu bị dị ứng với tôm và các loại hải sản vỏ cứng. Xin nhà trường lưu ý bữa ăn bán trú.',
      isImportant: true,
      createdAt: new Date('2026-04-10T10:00:00Z'),
      updatedAt: new Date('2026-04-10T10:00:00Z'),
    },
    {
      studentId,
      type: HealthNoteType.HEALTH,
      title: 'SỨC KHỎE',
      content: 'Cháu hay bị chảy máu cam khi vận động mạnh dưới trời nắng.',
      isImportant: false,
      createdAt: new Date('2026-04-15T08:30:00Z'),
      updatedAt: new Date('2026-04-15T08:30:00Z'),
    },
  ]);
  
  logger.log(`✅ Đã nạp 2 lưu ý sức khỏe cho học sinh ${student.fullName}`);

  await app.close();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
