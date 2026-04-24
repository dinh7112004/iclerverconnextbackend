
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Attendance } from './src/modules/attendance/entities/attendance.entity';
import { Student } from './src/modules/students/entities/student.entity';
import { Class } from './src/modules/classes/entities/class.entity';
import { School } from './src/modules/schools/entities/school.entity';
import { AcademicYear } from './src/modules/schools/entities/academic-year.entity';
import { Grade } from './src/modules/schools/entities/grade.entity';
import { Subject } from './src/modules/subjects/entities/subject.entity';
import { Teacher } from './src/modules/teachers/entities/teacher.entity';
import { Parent } from './src/modules/parents/entities/parent.entity';
import { StudentParentRelation } from './src/modules/parents/entities/student-parent-relation.entity';
import { TimeSlot } from './src/modules/schedules/entities/time-slot.entity';
import { Schedule } from './src/modules/schedules/entities/schedule.entity';
import { Grade as GradeRecord } from './src/modules/academic-records/entities/grade.entity';
import { AttendanceSummary } from './src/modules/attendance/entities/attendance-summary.entity';

async function check() {
    const AppDataSource = new DataSource({
        type: 'postgres',
        url: process.env.DATABASE_URL,
        entities: [
            Attendance, Student, Class, School, AcademicYear, Grade, Subject, Teacher,
            Parent, StudentParentRelation, TimeSlot, Schedule, GradeRecord, AttendanceSummary
        ],
        synchronize: false,
    });

    await AppDataSource.initialize();
    const attendanceRepo = AppDataSource.getRepository(Attendance);
    const studentRepo = AppDataSource.getRepository(Student);

    const firstStudent = await studentRepo.findOne({ where: {} });
    if (!firstStudent) {
        console.log('No students found');
        await AppDataSource.destroy();
        return;
    }

    console.log(`Checking attendance for student: ${firstStudent.fullName} (${firstStudent.id})`);

    const count = await attendanceRepo.count({
        where: { studentId: firstStudent.id }
    });
    console.log(`Total attendance records: ${count}`);

    const sepStart = '2023-09-01';
    const sepEnd = '2023-09-30';
    
    const records = await attendanceRepo.find({
        where: {
            studentId: firstStudent.id,
            // date: Between(sepStart, sepEnd) // TypeORM Between might need Date objects here if passing strings doesn't work as expected
        },
        relations: ['student', 'class'], // Try with fewer relations first
        take: 5
    });

    console.log('Sample records:', JSON.stringify(records, null, 2));

    await AppDataSource.destroy();
}

check().catch(console.error);
