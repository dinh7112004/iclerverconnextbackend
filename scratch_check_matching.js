const mongoose = require('mongoose');
const { Client } = require('pg');
const uri = "mongodb+srv://dinhpqph36470_db_user:KiwN9HFGTI93jqf6@cluster0.8yjzeyk.mongodb.net/sll_db?appName=Cluster0";
const pgUri = "postgresql://neondb_owner:npg_eUpu06WDROfL@ep-dark-math-ao72jnqc-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

async function run() {
  const pgClient = new Client({ connectionString: pgUri });
  await pgClient.connect();
  
  // Tìm học sinh Đào Hữu Thành (hoặc học sinh đầu tiên)
  const res = await pgClient.query('SELECT id, "fullName", "currentClassId" FROM students WHERE "fullName" LIKE \'%Thành%\' LIMIT 1');
  const student = res.rows[0];
  console.log(`Student: ${student.fullName}, ClassId: ${student.currentClassId}`);
  
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const course = await db.collection('courses').findOne({ name: /Toán học/ });
  
  console.log(`Course: ${course.name}`);
  console.log(`ClassIds in Course: ${JSON.stringify(course.classIds)}`);
  
  const isMatch = course.classIds.includes(student.currentClassId);
  console.log(`MATCH FOUND: ${isMatch}`);
  
  await pgClient.end();
  process.exit(0);
}
run();
