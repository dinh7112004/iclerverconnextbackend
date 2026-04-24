import 'dotenv/config';
import { AppDataSource } from '../data-source';
import { Menu, MealType } from '../../modules/nutrition/entities/menu.entity';
import { HealthNote } from '../../modules/health/entities/health-note.entity';
import { Book } from '../../modules/library/entities/book.entity';
import { Message, MessageType, MessageStatus } from '../../modules/messaging/entities/message.entity';
import { Student } from '../../modules/students/entities/student.entity';
import { User } from '../../modules/users/entities/user.entity';
import { UserRole } from '../../common/enums/role.enum';

async function seedAuxiliary() {
  console.log('🍕 Seeding Auxiliary Data (Menu, Health, Library, Messaging)...');
  await AppDataSource.initialize();

  const menuRepo = AppDataSource.getRepository(Menu);
  const healthNoteRepo = AppDataSource.getRepository(HealthNote);
  const bookRepo = AppDataSource.getRepository(Book);
  const messageRepo = AppDataSource.getRepository(Message);
  const studentRepo = AppDataSource.getRepository(Student);
  const userRepo = AppDataSource.getRepository(User);

  const students = await studentRepo.find({ take: 5 });
  const teachers = await userRepo.find({ where: { role: UserRole.TEACHER }, take: 1 });

  // Clear
  await AppDataSource.query(`TRUNCATE TABLE menus, health_notes, books, messages CASCADE;`);

  // Menu
  const today = new Date();
  for (let i = -2; i <= 5; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    await menuRepo.save({
      schoolId: students[0].schoolId,
      date: date.toISOString().split('T')[0],
      mealType: MealType.LUNCH,
      dishName: 'Cơm gà xối mỡ',
      description: 'Gà ta thả vườn, cơm dẻo thơm',
    });
  }

  // Health
  for (const student of students) {
    await healthNoteRepo.save({
      studentId: student.id,
      type: 'health' as any,
      title: 'Khám sức khỏe định kỳ',
      content: 'Sức khỏe tốt, hoạt bát, cân nặng và chiều cao phát triển bình thường.',
      isImportant: false,
    });
  }

  // Library
  await bookRepo.save({ title: 'Doraemon', author: 'Fujiko F. Fujio', category: 'Truyện tranh', totalCopies: 5, availableCopies: 5 });
  await bookRepo.save({ title: 'Harry Potter', author: 'J.K. Rowling', category: 'Tiểu thuyết', totalCopies: 3, availableCopies: 2 });

  // Messaging
  for (const student of students) {
    const parentUser = await userRepo.findOne({ where: { email: `phuhuynh${student.studentCode.replace('HS', '')}@thcsnguyendu.edu.vn` } });
    if (parentUser) {
      await messageRepo.save({
        senderId: teachers[0].id,
        recipientId: parentUser.id,
        studentId: student.id,
        subject: 'Thông báo học tập',
        body: `Chào phụ huynh, em ${student.fullName} học tập rất tốt.`,
        messageType: MessageType.DIRECT,
        status: MessageStatus.SENT,
      });
    }
  }

  console.log('✅ Auxiliary seeding completed.');
  await AppDataSource.destroy();
}

seedAuxiliary().catch(e => console.error(e));
