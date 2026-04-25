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

  constructor() {
    // Initialize Firebase Admin if not already initialized
    if (admin.apps.length === 0) {
      try {
        const serviceAccountPath = path.join(process.cwd(), 'firebase-service-account.json');
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccountPath),
          storageBucket: 'thithu123.firebasestorage.app', // Thay bằng bucket của bạn nếu khác
        });
      } catch (error) {
        console.error('Firebase initialization error:', error);
      }
    }
    this.bucket = admin.storage().bucket();
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

    const fileName = `${folder}/${uuid()}${extname(file.originalname)}`;
    const blob = this.bucket.file(fileName);
    
    const blobStream = blob.createWriteStream({
      metadata: {
        contentType: file.mimetype,
      },
      resumable: false
    });

    return new Promise((resolve, reject) => {
      blobStream.on('error', (err) => {
        console.error('Firebase Upload Error:', err);
        reject(new BadRequestException('Failed to upload to Google Storage'));
      });

      blobStream.on('finish', async () => {
        // Làm cho file có thể truy cập công khai
        await blob.makePublic();
        
        // Trả về link Google Storage
        const publicUrl = `https://storage.googleapis.com/${this.bucket.name}/${fileName}`;
        
        resolve({
          success: true,
          url: publicUrl,
        });
      });

      blobStream.end(file.buffer);
    });
  }
}
