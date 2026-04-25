const mongoose = require('mongoose');
const uri = "mongodb+srv://dinhpqph36470_db_user:KiwN9HFGTI93jqf6@cluster0.8yjzeyk.mongodb.net/sll_db?appName=Cluster0";

async function run() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  
  const ids = ['d726e1e9-c887-4892-a748-dc8ace334082', '64ed3320-5ca9-4031-a4c3-fa4982c941d4'];
  
  const notis = await db.collection('notifications').find({ 
    userId: { $in: ids },
    priority: { $in: ['urgent', 'high'] }
  }).toArray();
  
  console.log(`Kiểm tra thông báo khẩn cấp cho gia đình bé Đào Hữu Thành:`);
  if (notis.length === 0) {
    console.log("KHÔNG có thông báo khẩn cấp nào cho gia đình này.");
  } else {
    notis.forEach(n => console.log(`- [${n.status}] ${n.title}: ${n.message}`));
  }
  
  process.exit(0);
}
run();
