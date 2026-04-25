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
      const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
      const refreshToken = process.env.GOOGLE_REFRESH_TOKEN?.trim();

      if (!clientId || !clientSecret || !refreshToken) {
        throw new Error('Missing Google OAuth2 credentials in environment variables');
      }

      const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
      oauth2Client.setCredentials({ refresh_token: refreshToken });

      this.drive = google.drive({ version: 'v3', auth: oauth2Client });
      console.log('Google Drive OAuth2 initialized');
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
      
      // 1. Upload file lên Google Drive
      const response = await this.drive.files.create({
        requestBody: {
          name: fileName,
          mimeType: file.mimetype,
          parents: ['1q4kD7cjPcdu_ZfW_7j5nVu5UPkzQjVXr'], // Giữ lại folder ID cũ của mày
        },
        media: {
          mimeType: file.mimetype,
          body: Readable.from(file.buffer),
        },
      });

      const fileId = response.data.id;

      // 2. Cấp quyền public (ai có link cũng xem được)
      await this.drive.permissions.create({
        fileId: fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });

      // 3. Trả về link thumbnail (size 1000) để app hiển thị đẹp và nhanh
      const publicUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
      
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
