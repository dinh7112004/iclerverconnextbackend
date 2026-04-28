import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class KeepAliveService implements OnModuleInit {
  private readonly logger = new Logger(KeepAliveService.name);
  private readonly url = 'https://iclerverconnextbackend.onrender.com/api/v1/auth/me';

  onModuleInit() {
    // Chạy ngay khi app khởi động
    this.startPinging();
  }

  private startPinging() {
    this.logger.log('🚀 Keep-Alive Service started. Pinging every 10 minutes...');
    
    // Đặt lịch cứ 10 phút (600,000 ms) gọi một lần
    setInterval(async () => {
      try {
        await axios.get(this.url);
        this.logger.debug('Self-ping successful: Server is awake! ✅');
      } catch (error) {
        this.logger.warn('Self-ping failed (but that is okay, it still wakes up the server): ' + error.message);
      }
    }, 600000); 
  }
}
