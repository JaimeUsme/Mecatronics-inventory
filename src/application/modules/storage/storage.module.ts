/**
 * Storage Module
 * 
 * Módulo que agrupa todos los componentes relacionados con almacenamiento de archivos:
 * - Casos de uso de subida de archivos
 * - Controladores de subida
 * - Adaptadores de almacenamiento (GCS)
 */
import { Module } from '@nestjs/common';
import { UploadImageUseCase } from '@application/use-cases/upload-image.use-case';
import { GcsStorageAdapter } from '@infrastructure/storage/gcs.storage.adapter';
import { UploadController } from '@presentation/controllers/storage/upload.controller';

@Module({
  controllers: [UploadController],
  providers: [
    {
      provide: 'FileStoragePort',
      useClass: GcsStorageAdapter,
    },
    UploadImageUseCase,
  ],
  exports: [UploadImageUseCase],
})
export class StorageModule {}


