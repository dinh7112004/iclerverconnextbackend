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
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuid } from 'uuid';
import * as fs from 'fs';

@Controller('uploads')
export class UploadsController {
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req: any, file, cb) => {
          const folder = req.query.folder || 'others';
          const uploadPath = `./public/${folder}`;
          
          if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
          }
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const randomName = uuid();
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|pdf)$/i)) {
          return cb(new BadRequestException('Only image and pdf files are allowed!'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File, @Query('folder') folder: string = 'others', @Req() request: any) {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    
    // Lấy host gốc (ví dụ: https://...onrender.com)
    // Lưu ý: static assets thường nằm ở root, không nằm dưới /api/v1
    const protocol = request.protocol;
    const host = request.get('host');
    const rootUrl = `${protocol}://${host}`;

    return {
      success: true,
      url: `${rootUrl}/${folder}/${file.filename}`,
    };

  }
}
