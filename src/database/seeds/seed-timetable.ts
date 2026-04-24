import 'dotenv/config';
import { AppDataSource } from '../data-source';
import { TimeSlot } from '../../modules/schedules/entities/time-slot.entity';
import { Schedule } from '../../modules/schedules/entities/schedule.entity';
import { Class } from '../../modules/classes/entities/class.entity';
import { Subject } from '../../modules/subjects/entities/subject.entity';
import { Teacher } from '../../modules/teachers/entities/teacher.entity';
import { AcademicYear } from '../../modules/schools/entities/academic-year.entity';

async function seedTimetable() {
  console.log('📝 Seeding Full 10-Period Timetable Data...');
  await AppDataSource.initialize();

  const timeSlotRepo = AppDataSource.getRepository(TimeSlot);
  const scheduleRepo = AppDataSource.getRepository(Schedule);
  const classRepo = AppDataSource.getRepository(Class);
  const subjectRepo = AppDataSource.getRepository(Subject);
  const teacherRepo = AppDataSource.getRepository(Teacher);
  const academicYearRepo = AppDataSource.getRepository(AcademicYear);

  // Clear existing
  console.log('🗑️ Clearing old schedules and time slots...');
  await AppDataSource.query(`TRUNCATE TABLE schedules, time_slots CASCADE;`);

  const currentYear = await academicYearRepo.findOne({ where: { isCurrent: true } });
  if (!currentYear) {
      console.log('❌ No active academic year found.');
      return;
  }
  const schoolId = currentYear.schoolId;

  // 1. Create 10 Time Slots
  const slots = [
    // Morning (1-5)
    { period: 1, name: 'Tiết 1', startTime: '07:00', endTime: '07:45' },
    { period: 2, name: 'Tiết 2', startTime: '07:50', endTime: '08:35' },
    { period: 3, name: 'Tiết 3', startTime: '08:40', endTime: '09:25' },
    { period: 4, name: 'Tiết 4', startTime: '09:45', endTime: '10:30' },
    { period: 5, name: 'Tiết 5', startTime: '10:35', endTime: '11:20' },
    // Afternoon (6-10)
    { period: 6, name: 'Tiết 6', startTime: '13:00', endTime: '13:45' },
    { period: 7, name: 'Tiết 7', startTime: '13:50', endTime: '14:35' },
    { period: 8, name: 'Tiết 8', startTime: '14:55', endTime: '15:40' },
    { period: 9, name: 'Tiết 9', startTime: '15:45', endTime: '16:30' },
    { period: 10, name: 'Tiết 10', startTime: '16:35', endTime: '17:20' },
  ];

  for (const s of slots) {
    await timeSlotRepo.save({ schoolId, ...s, duration: 45, isActive: true });
  }
  console.log('✅ 10 Time slots created.');

  // 2. Generate Schedules
  const classes = await classRepo.find({ relations: ['grade'] });
  const subjects = await subjectRepo.find();
  const teachers = await teacherRepo.find();

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  const newSchedules = [];

  for (const cls of classes) {
    const gradeLevel = cls.grade.gradeLevel;
    const gradeSubjects = subjects.filter(s => s.gradeLevel === gradeLevel);
    
    if (gradeSubjects.length === 0) continue;

    for (const day of days) {
      for (let period = 1; period <= 10; period++) {
        // Pick a random subject for this period
        const subject = gradeSubjects[Math.floor(Math.random() * gradeSubjects.length)];
        
        // Find a teacher for this subject, or pick random
        const teacher = teachers.find(t => t.specialization === subject.name) || teachers[Math.floor(Math.random() * teachers.length)];
        
        const slot = slots.find(s => s.period === period);

        newSchedules.push({
            classId: cls.id,
            schoolId,
            academicYearId: currentYear.id,
            semester: 'SEMESTER_1',
            dayOfWeek: day,
            period,
            startTime: slot.startTime,
            endTime: slot.endTime,
            subjectId: subject.id,
            teacherId: teacher.id,
            room: `P${gradeLevel}0${cls.name.replace(/[^0-9]/g, '') || '1'}`,
            scheduleType: 'regular',
            isActive: true,
            createdBy: 'system'
        });
      }
    }
  }

  // Insert in chunks
  const chunkSize = 100;
  for (let i = 0; i < newSchedules.length; i += chunkSize) {
    await scheduleRepo.save(newSchedules.slice(i, i + chunkSize));
  }

  console.log(`✅ ${newSchedules.length} schedule records seeded successfully!`);
  await AppDataSource.destroy();
}

seedTimetable().catch(e => console.error(e));
