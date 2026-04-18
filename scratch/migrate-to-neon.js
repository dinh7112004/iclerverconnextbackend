const { Client } = require('pg');

const LOCAL_URL = 'postgresql://localhost:5432/sll_database';
const REMOTE_URL = 'postgresql://neondb_owner:npg_os7gxvu0MBGX@ep-lucky-scene-am466uu0.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require';

const TABLES_ORDER = [
  'users',
  'schools',
  'academic_years',
  'grades',
  'subjects',
  'time_slots',
  'teachers',
  'classes',
  'students',
  'parents',
  'student_parent_relations',
  'student_health_info',
  'attendance',
  'attendance_summary',
  'schedules',
  'exam_schedules',
  'menus',
  'messages',
  'health_notes',
  'academic_summaries',
  'grade_records'
];

async function migrate() {
  const localClient = new Client({ connectionString: LOCAL_URL });
  const remoteClient = new Client({ connectionString: REMOTE_URL });

  try {
    console.log('🔗 Connecting to PostgreSQL databases...');
    await localClient.connect();
    await remoteClient.connect();
    console.log('✅ Connected.');

    try {
      // Avoid transaction for Neon free tier to prevent "aborted transaction" errors
      await remoteClient.query("SET session_replication_role = 'replica'");
      console.log('⚙️ Constraints disabled (replica mode)');
    } catch (e) {
      console.warn('⚠️ Could not set replica mode.');
    }

    for (const tableName of TABLES_ORDER) {
      console.log(`\n📦 Migrating table: [${tableName}]`);

      const countRes = await localClient.query(`SELECT count(*) FROM "${tableName}"`);
      const totalRows = parseInt(countRes.rows[0].count);

      if (totalRows === 0) {
        console.log('   - Empty local table, but checking if remote needs clearing...');
        await remoteClient.query(`TRUNCATE TABLE "${tableName}" CASCADE`);
        continue;
      }

      console.log(`   - Found ${totalRows} rows locally.`);
      await remoteClient.query(`TRUNCATE TABLE "${tableName}" CASCADE`);

      const BATCH_SIZE = 500;
      let migratedCount = 0;

      while (migratedCount < totalRows) {
        const remaining = totalRows - migratedCount;
        const currentBatchSize = Math.min(BATCH_SIZE, remaining);

        const rowsRes = await localClient.query(
          `SELECT * FROM "${tableName}" ORDER BY 1 LIMIT $1 OFFSET $2`,
          [currentBatchSize, migratedCount]
        );

        const rows = rowsRes.rows;
        if (rows.length === 0) break;

        const columns = Object.keys(rows[0]);
        const columnsStr = columns.map(c => `"${c}"`).join(', ');

        const insertQuery = {
          text: `INSERT INTO "${tableName}" (${columnsStr}) VALUES ${rows.map((_, i) => `(${columns.map((_, j) => `$${i * columns.length + j + 1}`).join(', ')})`).join(', ')}`,
          values: rows.flatMap(row => columns.map(col => row[col]))
        };

        if (tableName !== 'grade_records' || migratedCount > 130000) { 
           // Optimization: grade_records is already partially done and very slow, 
           // but since we TRUNCATE, we must do it all over again or skip what's already there.
           // Actually, TRUNCATE is safer. Let's do it all.
        }
        
        await remoteClient.query(insertQuery);
        migratedCount += rows.length;
        process.stdout.write(`   - Progress: ${migratedCount}/${totalRows} rows (${Math.round(migratedCount/totalRows*100)}%)\r`);
      }
      console.log(`\n   ✅ Migrated ${migratedCount} rows successfully.`);
    }

    await remoteClient.query("SET session_replication_role = 'origin'");
    console.log('\n✨ COMPLETE: All 21 tables migrated to Neon successfully!');

  } catch (err) {
    console.error('\n❌ Migration Failed:', err.stack);
  } finally {
    await localClient.end();
    await remoteClient.end();
  }
}

migrate();
