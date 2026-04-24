import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Student } from '../../modules/students/entities/student.entity';
import { Attendance, AttendanceStatus } from '../../modules/attendance/entities/attendance.entity';
import { User } from '../../modules/users/entities/user.entity';
import { School } from '../../modules/schools/entities/school.entity';
import { Grade } from '../../modules/schools/entities/grade.entity';
import { AcademicYear } from '../../modules/schools/entities/academic-year.entity';
import { Subject } from '../../modules/subjects/entities/subject.entity';
import { Teacher } from '../../modules/teachers/entities/teacher.entity';
import { Parent } from '../../modules/parents/entities/parent.entity';
import { StudentParentRelation } from '../../modules/parents/entities/student-parent-relation.entity';
import { Class } from '../../modules/classes/entities/class.entity';
import { TimeSlot } from '../../modules/schedules/entities/time-slot.entity';
import { Schedule } from '../../modules/schedules/entities/schedule.entity';
import { Grade as GradeRecord } from '../../modules/academic-records/entities/grade.entity';
import { AttendanceSummary } from '../../modules/attendance/entities/attendance-summary.entity';

async function seed() {
    console.log('🌱 Starting bulk attendance seeding for ALL students...');

    const AppDataSource = new DataSource({
        type: 'postgres',
        url: process.env.DATABASE_URL,
        entities: [
            User, School, Grade, AcademicYear, Subject, Teacher, Student,
            Parent, StudentParentRelation, Class, TimeSlot, Schedule,
            Attendance, GradeRecord, AttendanceSummary
        ],
        synchronize: false,
    });

    await AppDataSource.initialize();
    const studentRepo = AppDataSource.getRepository(Student);
    const attendanceRepo = AppDataSource.getRepository(Attendance);

    const students = await studentRepo.find();
    console.log(`Found ${students.length} students. Generating data for September 2023...`);

    // Clean up Sep 2023 for everyone to avoid duplicates
    await attendanceRepo.createQueryBuilder()
        .delete()
        .where('date >= :start', { start: '2023-09-01' })
        .andWhere('date <= :end', { end: '2023-09-30' })
        .execute();

    const batchSize = 100;
    const records = [];
    let seededCount = 0;

    // Dates for September 2023 (excluding weekends)
    const schoolDays = [];
    for (let day = 1; day <= 30; day++) {
        const dateStr = `2023-09-${day.toString().padStart(2, '0')}`;
        const date = new Date(dateStr);
        if (date.getDay() !== 0 && date.getDay() !== 6) {
            schoolDays.push(dateStr);
        }
    }

    for (const student of students) {
        for (const dateStr of schoolDays) {
            const rand = Math.random();
            let status: AttendanceStatus;
            if (rand < 0.9) status = AttendanceStatus.PRESENT;
            else if (rand < 0.95) status = AttendanceStatus.ABSENT;
            else if (rand < 0.98) status = AttendanceStatus.EXCUSED;
            else status = AttendanceStatus.LATE;

            records.push({
                studentId: student.id,
                classId: student.currentClassId,
                schoolId: student.schoolId,
                date: dateStr,
                session: 'all_day',
                status,
                markedAt: new Date(),
            });

            if (records.length >= batchSize) {
                await attendanceRepo.save(records);
                seededCount += records.length;
                records.length = 0;
                process.stdout.write(`\rSeeded ${seededCount} records...`);
            }
        }
    }

    if (records.length > 0) {
        await attendanceRepo.save(records);
        seededCount += records.length;
    }

    console.log(`\n✅ Bulk seeding completed! Total records: ${seededCount}`);
    await AppDataSource.destroy();
}

seed().catch(console.error);
