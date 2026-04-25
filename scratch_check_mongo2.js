const mongoose = require('mongoose');
const uri = "mongodb+srv://dinhpqph36470_db_user:KiwN9HFGTI93jqf6@cluster0.8yjzeyk.mongodb.net/?appName=Cluster0";

async function run() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const allCourses = await db.collection('courses').find({}).toArray();
  console.log("Total courses:", allCourses.length);
  if (allCourses.length > 0) {
    allCourses.forEach(c => console.log("Course code:", c.code, "Grade:", c.gradeLevel, "ClassIds:", c.classIds));
  }
  process.exit(0);
}
run();
