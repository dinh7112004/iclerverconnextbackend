import 'dotenv/config';
import { DataSource } from 'typeorm';
import { User } from '../modules/users/entities/user.entity';
import { School } from '../modules/schools/entities/school.entity';
import { Grade } from '../modules/schools/entities/grade.entity';
import { AcademicYear } from '../modules/schools/entities/academic-year.entity';
import { Subject } from '../modules/subjects/entities/subject.entity';
import { Teacher } from '../modules/teachers/entities/teacher.entity';
import { Student } from '../modules/students/entities/student.entity';
import { Parent } from '../modules/parents/entities/parent.entity';
import { StudentParentRelation } from '../modules/parents/entities/student-parent-relation.entity';
import { Class } from '../modules/classes/entities/class.entity';
import { TimeSlot } from '../modules/schedules/entities/time-slot.entity';
import { Schedule } from '../modules/schedules/entities/schedule.entity';
import { Attendance } from '../modules/attendance/entities/attendance.entity';
import { Grade as GradeRecord } from '../modules/academic-records/entities/grade.entity';
import { HealthNote } from '../modules/health/entities/health-note.entity';
import { MedicineInstruction } from '../modules/health/entities/medicine-instruction.entity';
import { StudentHealthInfo } from '../modules/students/entities/student-health-info.entity';
import { Menu } from '../modules/nutrition/entities/menu.entity';
import { Message } from '../modules/messaging/entities/message.entity';
import { AttendanceSummary } from '../modules/attendance/entities/attendance-summary.entity';
import { AcademicSummary } from '../modules/academic-records/entities/academic-summary.entity';
import { ExamSchedule } from '../modules/schedules/entities/exam-schedule.entity';
import { Book } from '../modules/library/entities/book.entity';
import { Assignment } from '../modules/lms/entities/assignment.entity';
import { Invoice } from '../modules/payments/entities/invoice.entity';
import { LeaveRequest } from '../modules/leave-requests/entities/leave-request.entity';
import { Survey } from '../modules/surveys/entities/survey.entity';
import { Payment } from '../modules/payments/entities/payment.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [
    User, School, Grade, AcademicYear, Subject, Teacher, 
    Student, Parent, StudentParentRelation, Class, 
    TimeSlot, Schedule, Attendance, GradeRecord, 
    HealthNote, MedicineInstruction, StudentHealthInfo, 
    Menu, Message, AttendanceSummary, AcademicSummary, 
    ExamSchedule, Book, Assignment, Invoice, 
    LeaveRequest, Survey, Payment
  ],
  synchronize: false,
});
