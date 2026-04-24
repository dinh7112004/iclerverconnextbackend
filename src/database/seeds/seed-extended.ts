import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { LMSService } from '../../modules/lms/lms.service';
import { PaymentsService } from '../../modules/payments/payments.service';
import { LeaveRequestsService } from '../../modules/leave-requests/leave-requests.service';
import { DataSource } from 'typeorm';
import { Student } from '../../modules/students/entities/student.entity';
import { Parent } from '../../modules/parents/entities/parent.entity';
import { User } from '../../modules/users/entities/user.entity';
import { Grade } from '../../modules/schools/entities/grade.entity';
import { InvoiceStatus } from '../../modules/payments/entities/invoice.entity';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { AssignmentStatus, AssignmentType } from '../../modules/lms/entities/assignment.entity';

async function seedExtended() {
  console.log('🚀 Starting Comprehensive Extended Seeding (5 students per grade)...');

  const app = await NestFactory.createApplicationContext(AppModule);
  const lmsService = app.get(LMSService);
  const paymentsService = app.get(PaymentsService);
  const leaveRequestsService = app.get(LeaveRequestsService);
  const dataSource = app.get(DataSource);
  
  const studentRepo = dataSource.getRepository(Student);
  const parentRepo = dataSource.getRepository(Parent);
  const gradeRepo = dataSource.getRepository(Grade);

  // 1. Clear MongoDB collections first
  // @ts-ignore
  const mongooseConnection = app.get<Connection>(getConnectionToken());
  if (mongooseConnection) {
    console.log('🗑️  Cleaning MongoDB collections...');
    const collections = ['assignments', 'submissions', 'invoices', 'leaverequests', 'surveys', 'courses'];
    for (const collName of collections) {
      try {
        await mongooseConnection.db.collection(collName).deleteMany({});
      } catch (e) {}
    }
  }

  // 2. Get all grades
  const allGrades = await gradeRepo.find({ order: { gradeLevel: 'ASC' } });

  for (const grade of allGrades) {
    console.log(`\n📚 Processing Grade ${grade.gradeLevel} (${grade.name})...`);

    const students = await studentRepo.find({
      where: { currentClass: { gradeId: grade.id } },
      relations: ['currentClass'],
      take: 5
    });

    if (students.length === 0) {
      console.log(`⚠️ No students found for Grade ${grade.gradeLevel}`);
      continue;
    }

    // Create a demo course for this grade
    const course = await lmsService.createCourse({
      code: `TOAN${grade.gradeLevel}_DEMO`,
      name: `Toán học lớp ${grade.gradeLevel}`,
      description: `Chương trình Toán học bám sát SGK khối ${grade.gradeLevel}`,
      subjectId: students[0].id,
      subjectName: 'Toán học',
      teacherId: 'teacher-id',
      teacherName: 'Giáo viên Bộ môn',
      academicYear: '2024-2025',
      semester: 'semester_1',
      createdBy: 'system'
    });

    for (const student of students) {
      console.log(`   👤 Student: ${student.fullName}`);

      // A. LMS / Assignment
      const assignment = await lmsService.createAssignment({
        courseId: (course as any)._id.toString(),
        title: `Bài tập về nhà tuần 1 - Khối ${grade.gradeLevel}`,
        description: 'Yêu cầu các em hoàn thành bài tập trong vở bài tập và chụp ảnh nộp lại.',
        maxScore: 10,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        type: AssignmentType.INDIVIDUAL,
        createdBy: 'system'
      });
      // @ts-ignore
      await lmsService.assignmentModel.updateOne({ _id: assignment._id }, { status: 'published' });

      // B. Payments / Invoice
      const parentRel = await dataSource.query(`SELECT "parentId" FROM student_parent_relations WHERE "studentId" = '${student.id}' LIMIT 1`);
      const parentId = parentRel[0]?.parentId;
      const parent = parentId ? await parentRepo.findOne({ where: { id: parentId } }) : null;

      await paymentsService.createInvoice({
        studentId: student.id,
        studentName: student.fullName,
        className: student.currentClass?.name || '',
        parentId: parent?.id || '',
        parentName: parent?.fullName || '',
        academicYear: '2024-2025',
        semester: 'semester_1',
        items: [
          { id: '1', name: `Học phí tháng 4/2026 - Khối ${grade.gradeLevel}`, quantity: 1, unitPrice: 3500000 + (grade.gradeLevel * 100000), amount: 3500000 + (grade.gradeLevel * 100000), type: 'tuition' },
          { id: '2', name: 'Tiền ăn bán trú', quantity: 1, unitPrice: 1200000, amount: 1200000, type: 'meal' }
        ],
        subtotal: 4700000 + (grade.gradeLevel * 100000),
        totalAmount: 4700000 + (grade.gradeLevel * 100000),
        remainingAmount: 4700000 + (grade.gradeLevel * 100000),
        status: InvoiceStatus.PENDING,
        dueDate: new Date('2026-05-10'),
      });

      // C. Leave Requests
      await leaveRequestsService.create({
        studentId: student.id,
        classId: student.currentClassId,
        parentId: parent?.id || '',
        type: 'day',
        singleDate: new Date('2026-04-20').toISOString(),
        reason: 'Gia đình xin cho cháu nghỉ vì lý do cá nhân.',
        status: 'approved',
        approvedBy: 'admin-id'
      });
    }
  }

  console.log('\n🌟 Comprehensive Extended Seeding Successful! 5 students per grade now have data.');
  await app.close();
}

seedExtended().catch(err => {
  console.error('❌ Extended Seed failed:', err);
  process.exit(1);
});
