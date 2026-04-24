import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { DataSource } from 'typeorm';
import { Student } from '../../modules/students/entities/student.entity';
import { Attendance, AttendanceStatus } from '../../modules/attendance/entities/attendance.entity';
import { Class } from '../../modules/classes/entities/class.entity';

async function seed() {
    console.log('--- SEEDING ATTENDANCE DATA ---');
    const app = await NestFactory.createApplicationContext(AppModule);
    const dataSource = app.get(DataSource);
    const studentRepo = dataSource.getRepository(Student);
    const attendanceRepo = dataSource.getRepository(Attendance);
    const classRepo = dataSource.getRepository(Class);

    try {
        const studentId = 'a4777360-006b-41b4-870f-23d897277144';
        const student = await studentRepo.findOne({ 
            where: { id: studentId },
            relations: ['currentClass']
        });

        if (!student) {
            console.error('Student not found!');
            return;
        }

        // Use the first class of the student or a default one
        const classId = student.currentClassId || 'c201889c-512c-490b-9364-779870be8e09';
        
        const schoolId = student.schoolId;

        console.log(`Seeding for Student: ${student.fullName}, Class: ${classId}, School: ${schoolId}`);

        // Delete ALL existing attendance for this student to ensure a clean slate
        console.log('Cleaning up all previous attendance records for this student...');
        await attendanceRepo.createQueryBuilder()
            .delete()
            .where('studentId = :studentId', { studentId })
            .execute();

        const records = [];
        // Loop through September 2023 (excluding weekends)
        for (let day = 1; day <= 30; day++) {
            const dateStr = `2023-09-${day.toString().padStart(2, '0')}`;
            const date = new Date(dateStr);
            const dayOfWeek = date.getDay(); // 0: Sun, 6: Sat

            if (dayOfWeek === 0 || dayOfWeek === 6) continue;

            let status = AttendanceStatus.PRESENT;
            let reason = null;
            let note = null;

            // Add some variety
            if (day === 13) {
                status = AttendanceStatus.EXCUSED;
                reason = 'Nghỉ ốm';
                note = 'Phụ huynh xin phép qua điện thoại';
            } else if (day === 20) {
                status = AttendanceStatus.ABSENT;
                reason = 'Không rõ lý do';
                note = 'Không thấy đến lớp, gọi điện không nhấc máy';
            } else if (day === 25) {
                status = AttendanceStatus.EXCUSED;
                reason = 'Việc gia đình';
                note = 'Học sinh về quê';
            }

            records.push(
                attendanceRepo.create({
                    studentId,
                    classId,
                    schoolId,
                    date: dateStr as any,
                    session: 'all_day',
                    status,
                    reason,
                    note,
                    markedAt: new Date(),
                    markedBy: null
                })
            );
        }

        await attendanceRepo.save(records);
        console.log(`Successfully seeded ${records.length} attendance records.`);

    } catch (error) {
        console.error('Seed failed:', error);
    } finally {
        await app.close();
    }
}

seed();
