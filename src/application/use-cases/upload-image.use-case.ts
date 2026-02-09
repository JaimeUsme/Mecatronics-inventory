import { Injectable, Inject } from '@nestjs/common';
import { FileStoragePort } from '../../domain/ports/storage.port';

@Injectable()
export class UploadImageUseCase {
  constructor(
    @Inject('FileStoragePort')
    private readonly storage: FileStoragePort
  ) {}

  async execute(file: {
    buffer: Buffer;
    originalName: string;
    mimeType: string;
  }): Promise<string> {
    return this.storage.upload(
      file.buffer,
      file.originalName,
      file.mimeType
    );
  }
}
