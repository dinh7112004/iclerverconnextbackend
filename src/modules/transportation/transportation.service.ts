import { Injectable } from '@nestjs/common';

@Injectable()
export class TransportationService {
  async getStudentBusInfo(studentId: string) {
    // Để phục vụ test 100 học sinh, mình dùng mã hóa đơn giản từ studentId để tạo dữ liệu khác nhau
    const idHash = studentId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    // Danh sách tài xế mẫu
    const drivers = [
      { name: 'Nguyễn Văn Mạnh', plate: '29B-154.22', phone: '0912345678' },
      { name: 'Lê Hoàng Long', plate: '29B-888.66', phone: '0901234567' },
      { name: 'Trần Minh Quân', plate: '29B-111.33', phone: '0988776655' },
    ];
    
    // Danh sách cô phụ trách mẫu
    const monitors = [
      { name: 'Trần Thu Hà', phone: '0987654321' },
      { name: 'Phạm Thanh Thủy', phone: '0977665544' },
      { name: 'Nguyễn Ngọc Anh', phone: '0966554433' },
    ];

    const driver = drivers[idHash % drivers.length];
    const monitor = monitors[idHash % monitors.length];

    return {
      driver: {
        id: `d_${idHash % 10}`,
        initials: 'TX',
        name: driver.name,
        plate: driver.plate,
        phone: driver.phone
      },
      monitor: {
        id: `m_${idHash % 10}`,
        initials: 'CS',
        name: monitor.name,
        role: 'Cô phụ trách tuyến',
        phone: monitor.phone
      },
      schedule: [
        {
          id: 's1',
          title: 'Xuất phát',
          time: '06:15',
          status: 'done',
        },
        {
          id: 's2',
          title: 'Điểm đón: Ngã tư Sở',
          time: '06:30',
          status: 'done',
        },
        {
          id: 's3',
          title: 'Điểm đón: Royal City (Học sinh đang lên xe)',
          time: '06:45',
          status: 'active',
        },
        {
          id: 's4',
          title: 'Điểm đón: Đại học Hà Nội',
          time: '07:00',
          status: 'pending',
        },
        {
          id: 's5',
          title: 'Đến trường THCS Ngôi Sao',
          time: '07:20',
          status: 'pending',
        }
      ]
    };
  }

  async getAllRoutes() {
    return [
      { id: 'r1', name: 'Tuyến số 01: Thanh Xuân - Cầu Giấy' },
      { id: 'r2', name: 'Tuyến số 02: Ba Đình - Hoàn Kiếm' },
    ];
  }
}
