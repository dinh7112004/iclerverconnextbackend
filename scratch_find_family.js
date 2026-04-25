const mongoose = require('mongoose');
const uri = "mongodb+srv://dinhpqph36470_db_user:KiwN9HFGTI93jqf6@cluster0.8yjzeyk.mongodb.net/sll_db?appName=Cluster0";

async function run() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  
  // 1. Tìm học sinh Đào Hữu Thành
  const student = await db.collection('students').findOne({ fullName: /Đào Hữu Thành/i });
  if (!student) {
    console.log("Không tìm thấy học sinh Đào Hữu Thành");
  } else {
    console.log(`Tìm thấy học sinh: ${student.fullName} (ID: ${student._id})`);
    // Tìm phụ huynh
    const parent = await db.collection('parents').findOne({ studentIds: student._id.toString() });
    if (parent) {
       console.log(`Phụ huynh của bé: (ID: ${parent.userId})`);
       const notis = await db.collection('notifications').find({ 
         userId: parent.userId,
         priority: { $in: ['urgent', 'high'] }
       }).toArray();
       console.log(`Tìm thấy ${notis.length} thông báo quan trọng cho phụ huynh này.`);
       notis.forEach(n => console.log(`- [${n.status}] ${n.title}`));
    } else {
       // Thử tìm trong users với studentId
       const user = await db.collection('users').findOne({ studentId: student._id.toString() });
       if (user) {
         console.log(`Tìm thấy User: ${user.fullName} (ID: ${user._id})`);
       }
    }
  }
  
  process.exit(0);
}
run();
