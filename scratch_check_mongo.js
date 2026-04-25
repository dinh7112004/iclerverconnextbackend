const mongoose = require('mongoose');
const uri = "mongodb+srv://dinhpqph36470_db_user:KiwN9HFGTI93jqf6@cluster0.8yjzeyk.mongodb.net/?appName=Cluster0";

async function run() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const courses = await db.collection('courses').find({ classIds: "0b28cf21-cdea-4f78-ab1a-dacb11d2fc46" }).toArray();
  console.log("Courses for 6A:", courses.length);
  const allCourses = await db.collection('courses').find({}).toArray();
  console.log("Total courses:", allCourses.length);
  const assignments = await db.collection('assignments').find({}).toArray();
  console.log("Total assignments:", assignments.length);
  
  if (allCourses.length > 0) {
    console.log("Sample classIds from first course:", allCourses[0].classIds);
  }
  
  process.exit(0);
}
run();
