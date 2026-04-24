import 'dotenv/config';
import { AppDataSource } from '../data-source';
import { Attendance } from '../../modules/attendance/entities/attendance.entity';
import { Grade as GradeRecord, GradeType, Semester } from '../../modules/academic-records/entities/grade.entity';
import { Student } from '../../modules/students/entities/student.entity';
import { Teacher } from '../../modules/teachers/entities/teacher.entity';
import { Subject } from '../../modules/subjects/entities/subject.entity';
import { AcademicYear } from '../../modules/schools/entities/academic-year.entity';
import { AttendanceStatus } from '../../common/enums/status.enum';

async function seedAcademic() {
  console.log('📝 Seeding Academic Data (Attendance & Grades)...');
  await AppDataSource.initialize();

  const attendanceRepo = AppDataSource.getRepository(Attendance);
  const gradeRecordRepo = AppDataSource.getRepository(GradeRecord);
  const studentRepo = AppDataSource.getRepository(Student);
  const teacherRepo = AppDataSource.getRepository(Teacher);
  const subjectRepo = AppDataSource.getRepository(Subject);
  const academicYearRepo = AppDataSource.getRepository(AcademicYear);

  const students = await studentRepo.find();
  const teachers = await teacherRepo.find();
  const subjects = await subjectRepo.find();
  const academicYear = await academicYearRepo.findOne({ where: { isCurrent: true } });

  if (!academicYear) return;

  // Clear
  await AppDataSource.query(`TRUNCATE TABLE attendance, grade_records CASCADE;`);

  // Attendance (Last 7 days)
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    for (const student of students) {
      await attendanceRepo.save({
        studentId: student.id,
        classId: student.currentClassId,
        schoolId: student.schoolId,
        date,
        status: AttendanceStatus.PRESENT,
        markedBy: teachers[0].id,
      });
    }
  }

  // Grades
  for (const student of students) {
    const studentSubjects = subjects.filter(s => s.gradeLevel === 6); // Simplified
    for (const subject of studentSubjects) {
      await gradeRecordRepo.save({
        studentId: student.id,
        subjectId: subject.id,
        classId: student.currentClassId,
        schoolId: student.schoolId,
        academicYearId: academicYear.id,
        semester: Semester.SEMESTER_1,
        gradeType: GradeType.QUIZ_15,
        examNumber: 1,
        score: 8 + Math.random() * 2,
        coefficient: 1,
        examDate: new Date(),
        isPublished: true,
      });
    }
  }

  console.log('✅ Academic seeding completed.');
  await AppDataSource.destroy();
}

seedAcademic().catch(e => console.error(e));
