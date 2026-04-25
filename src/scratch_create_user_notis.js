const mongoose = require('mongoose');
const uri = "mongodb+srv://dinhpqph36470_db_user:KiwN9HFGTI93jqf6@cluster0.8yjzeyk.mongodb.net/sll_db?appName=Cluster0";

async function run() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  
  const ids = ['d726e1e9-c887-4892-a748-dc8ace334082', '64ed3320-5ca9-4031-a4c3-fa4982c941d4'];
  
  const seeds = [];
  for (const userId of ids) {
    seeds.push({
      userId: userId,
      type: 'ANNOUNCEMENT',
      title: 'Hệ thống điểm danh',
      message: '⚠️ BÉ ĐÀO HỮU THÀNH VẮNG MẶT KHÔNG PHÉP\n\nHệ thống ghi nhận học sinh vắng mặt tại buổi điểm danh sáng nay.',
      priority: 'urgent',
      status: 'unread',
      data: {
        sourceName: 'Hệ thống điểm danh',
        sourceIcon: 'warning-outline',
        badge: 'KHẨN CẤP',
        time: '08:00',
        date: '25/04/2026',
      },
      createdAt: new Date(),
    });

    seeds.push({
      userId: userId,
      type: 'PAYMENT_DUE',
      title: 'Nhắc nhở: Hạn đóng học phí T9 - Đào Hữu Thành',
      message: 'Quý phụ huynh vui lòng hoàn thành đóng học phí tháng 9 cho bé Đào Hữu Thành trước ngày 30/09/2023.',
      priority: 'high',
      status: 'unread',
      data: {
        sourceName: 'Phòng Tài chính',
        sourceIcon: 'card-outline',
        badge: 'Học phí',
        time: '10:00',
        date: '25/04/2026',
      },
      createdAt: new Date(),
    });
  }
  
  await db.collection('notifications').insertMany(seeds);
  console.log(`Đã tạo thành công ${seeds.length} thông báo khẩn cấp cho gia đình bé Đào Hữu Thành.`);
  process.exit(0);
}
run();
