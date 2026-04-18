import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      success: true,
      message: 'SLL Electronic System API is running!',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  getVersion() {
    return {
      success: true,
      data: {
        version: '1.0.0',
        apiVersion: 'v1',
        environment: process.env.NODE_ENV || 'development',
      },
    };
  }
}
