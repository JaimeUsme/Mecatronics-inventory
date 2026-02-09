import {
    Controller,
    Post,
    UploadedFile,
    UseInterceptors,
  } from '@nestjs/common';
  import { FileInterceptor } from '@nestjs/platform-express';
  import { UploadImageUseCase } from '@application/use-cases/upload-image.use-case';
  
  @Controller('files')
  export class UploadController {
    constructor(
      private readonly uploadImageUseCase: UploadImageUseCase,
    ) {}
  
    @Post('upload')
    @UseInterceptors(FileInterceptor('file'))
    async upload(@UploadedFile() file: Express.Multer.File) {
      return this.uploadImageUseCase.execute({
        buffer: file.buffer,
        originalName: file.originalname,
        mimeType: file.mimetype,
      });
    }
  }
  