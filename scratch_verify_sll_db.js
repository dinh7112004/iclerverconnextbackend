const mongoose = require('mongoose');
const uri = "mongodb+srv://dinhpqph36470_db_user:KiwN9HFGTI93jqf6@cluster0.8yjzeyk.mongodb.net/sll_db?appName=Cluster0";

async function run() {
  try {
    await mongoose.connect(uri);
    const db = mongoose.connection.db;
    const courses = await db.collection('courses').find({}).toArray();
    console.log(`[KIỂM TRA SLL_DB] Tổng số Khóa học: ${courses.length}`);
    if (courses.length > 0) {
      console.log(`[KIỂM TRA SLL_DB] Ví dụ một khóa học: ${courses[0].code}`);
    }
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}
run();
