const mongoose = require('mongoose');
const uri = "mongodb+srv://dinhpqph36470_db_user:KiwN9HFGTI93jqf6@cluster0.8yjzeyk.mongodb.net/sll_db?appName=Cluster0";

async function run() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  
  // 1. Tìm ID của người dùng Đào Hữu Thành
  const user = await db.collection('users').findOne({ fullName: /Đào Hữu Thành/i });
  if (!user) {
    console.log("Không tìm thấy user Đào Hữu Thành");
    process.exit(0);
  }
  
  console.log(`Kiểm tra thông báo cho User: ${user.fullName} (ID: ${user._id})`);
  
  // 2. Tìm thông báo dành riêng cho ID này hoặc cho tất cả ('all')
  const notis = await db.collection('notifications').find({ 
    $or: [ { userId: user._id.toString() }, { userId: 'all' } ],
    priority: { $in: ['urgent', 'high'] },
    status: 'unread'
  }).toArray();
  
  console.log(`Tìm thấy ${notis.length} thông báo quan trọng chưa đọc.`);
  notis.forEach(n => console.log(`- [${n.priority}] ${n.title}: ${n.message}`));
  
  process.exit(0);
}
run();
