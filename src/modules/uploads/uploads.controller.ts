import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Query,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuid } from 'uuid';
import * as admin from 'firebase-admin';
import * as path from 'path';

@Controller('uploads')
export class UploadsController {
  private bucket: any;

  private initializeFirebase() {
    if (admin.apps.length > 0) {
      this.bucket = admin.storage().bucket();
      return;
    }

    try {
      const config = process.env.FIREBASE_CONFIG;
      if (config) {
        // Ưu tiên đọc từ biến môi trường (Render)
        const serviceAccount = JSON.parse(config);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          storageBucket: 'thithu123.firebasestorage.app',
        });
        console.log('Firebase initialized from ENV');
      } else {
        // Local thì dùng file (nếu có)
        const serviceAccountPath = path.join(process.cwd(), 'firebase-service-account.json');
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccountPath),
          storageBucket: 'thithu123.firebasestorage.app',
        });
        console.log('Firebase initialized from FILE');
      }
      this.bucket = admin.storage().bucket();
    } catch (error) {
      console.warn('Firebase init warning:', error.message);
      // Không ném lỗi ở đây để tránh làm sập server lúc khởi động
    }
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif|pdf)$/i)) {
          return cb(new BadRequestException('Only image and pdf files are allowed!'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File, @Query('folder') folder: string = 'others') {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    // Chỉ khởi tạo khi thực sự cần upload
    this.initializeFirebase();

    if (!this.bucket) {
      throw new BadRequestException('Firebase Storage is not configured properly.');
    }

    const fileName = `${folder}/${uuid()}${extname(file.originalname)}`;
    const blob = this.bucket.file(fileName);
    
    const blobStream = blob.createWriteStream({
      metadata: { contentType: file.mimetype },
      resumable: false
    });

    return new Promise((resolve, reject) => {
      blobStream.on('error', (err) => {
        console.error('Firebase Upload Error:', err);
        reject(new BadRequestException('Failed to upload to Google Storage'));
      });

      blobStream.on('finish', async () => {
        try {
          await blob.makePublic();
          const publicUrl = `https://storage.googleapis.com/${this.bucket.name}/${fileName}`;
          resolve({ success: true, url: publicUrl });
        } catch (e) {
          // Fallback nếu không make public được (do quyền)
          const fallbackUrl = `https://firebasestorage.googleapis.com/v0/b/${this.bucket.name}/o/${encodeURIComponent(fileName)}?alt=media`;
          resolve({ success: true, url: fallbackUrl });
        }
      });

      blobStream.end(file.buffer);
    });
  }
}
