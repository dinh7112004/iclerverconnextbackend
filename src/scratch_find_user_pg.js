const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  await client.connect();
  
  const res = await client.query("SELECT * FROM students WHERE \"fullName\" ILIKE '%Đào Hữu Thành%'");
  
  if (res.rows.length > 0) {
    const student = res.rows[0];
    console.log('Học sinh:', student.fullName, 'ID:', student.id, 'UserId:', student.userId);
    
    const relRes = await client.query("SELECT p.\"userId\", p.\"fullName\" FROM parents p JOIN student_parent_relations spr ON spr.\"parentId\" = p.id WHERE spr.\"studentId\" = $1", [student.id]);
    
    if (relRes.rows.length > 0) {
       relRes.rows.forEach(p => console.log(`Phụ huynh: ${p.fullName} (UserId: ${p.userId})`));
    }
  }
  
  await client.end();
}
run();
