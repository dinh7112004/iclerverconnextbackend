import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuid } from 'uuid';
import { google } from 'googleapis';
import { Readable } from 'stream';
import * as path from 'path';

@Controller('uploads')
export class UploadsController {
  private drive: any;

  private async initializeDrive() {
    if (this.drive) return;

    try {
      const config = process.env.FIREBASE_CONFIG; // Dùng chung biến này cho tiện
      let auth;
      
      if (config) {
        const serviceAccount = JSON.parse(config);
        auth = new google.auth.GoogleAuth({
          credentials: serviceAccount,
          scopes: ['https://www.googleapis.com/auth/drive.file'],
        });
      } else {
        const serviceAccountPath = path.join(process.cwd(), 'firebase-service-account.json');
        auth = new google.auth.GoogleAuth({
          keyFile: serviceAccountPath,
          scopes: ['https://www.googleapis.com/auth/drive.file'],
        });
      }
      this.drive = google.drive({ version: 'v3', auth });
      console.log('Google Drive API initialized');
    } catch (error) {
      console.error('Google Drive initialization error:', error.message);
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

    await this.initializeDrive();

    if (!this.drive) {
      throw new BadRequestException('Google Drive is not configured properly.');
    }

    try {
      const fileName = `${folder}_${uuid()}${extname(file.originalname)}`;
      
      // Upload file lên Google Drive
      const response = await this.drive.files.create({
        requestBody: {
          name: fileName,
          mimeType: file.mimetype,
        },
        media: {
          mimeType: file.mimetype,
          body: Readable.from(file.buffer),
        },
      });

      const fileId = response.data.id;

      // Cấp quyền public cho file
      await this.drive.permissions.create({
        fileId: fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });

      // Link ảnh trực tiếp mà app có thể hiển thị được
      const publicUrl = `https://lh3.googleusercontent.com/d/${fileId}=s1000`;
      
      return {
        success: true,
        url: publicUrl,
        fileId: fileId,
      };
    } catch (error) {
      console.error('Google Drive Upload Error:', error);
      throw new BadRequestException('Failed to upload to Google Drive: ' + error.message);
    }
  }
}
