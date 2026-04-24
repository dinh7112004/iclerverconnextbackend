import 'dotenv/config';
import { AppDataSource } from '../data-source';

async function clearAll() {
  console.log('🗑️  Clearing all database data...');
  await AppDataSource.initialize();
  
  // PostgreSQL
  const tables = [
    'attendance', 'grade_records', 'health_notes', 'medicine_instructions', 
    'messages', 'menus', 'books', 'invoices', 'payments', 'leave_requests', 
    'surveys', 'exam_schedules', 'attendance_summaries', 'academic_summaries',
    'student_parent_relations', 'students', 'parents', 'classes', 'teachers',
    'subjects', 'academic_years', 'grades', 'schools', 'users'
  ];
  
  for (const table of tables) {
    try {
      await AppDataSource.query(`TRUNCATE TABLE "${table}" CASCADE;`);
    } catch (e) {
      // Some tables might not exist or be named differently
    }
  }
  
  console.log('✅ PostgreSQL cleared.');
  await AppDataSource.destroy();
}

clearAll().catch(console.error);
