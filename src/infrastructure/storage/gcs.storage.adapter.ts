import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import { FileStoragePort } from '../../domain/ports/storage.port';

@Injectable()
export class GcsStorageAdapter implements FileStoragePort {
  private readonly logger = new Logger(GcsStorageAdapter.name);
  private bucket;
  private bucketName: string;

  constructor() {
    this.bucketName = process.env.GCS_BUCKET;
    
    if (!this.bucketName) {
      this.logger.error('GCS_BUCKET no está configurado en las variables de entorno');
      throw new Error(
        'GCS_BUCKET no está configurado. Por favor, configura la variable de entorno GCS_BUCKET.',
      );
    }

    try {
      const storage = new Storage(); // usa GOOGLE_APPLICATION_CREDENTIALS o credenciales por defecto
      this.bucket = storage.bucket(this.bucketName);
      this.logger.log(`GCS Storage inicializado con bucket: ${this.bucketName}`);
    } catch (error) {
      this.logger.error(`Error al inicializar GCS Storage: ${error?.message}`);
      throw new Error(
        `Error al inicializar Google Cloud Storage: ${error?.message}. Verifica que GOOGLE_APPLICATION_CREDENTIALS esté configurado correctamente.`,
      );
    }
  }

  async upload(
    file: Buffer,
    filename: string,
    contentType: string
  ): Promise<string> {
    try {
      // Verificar que el bucket existe antes de intentar subir
      const [exists] = await this.bucket.exists();
      if (!exists) {
        this.logger.error(`El bucket ${this.bucketName} no existe`);
        throw new HttpException(
          `El bucket de Google Cloud Storage "${this.bucketName}" no existe. Por favor, verifica que el bucket esté creado y que la variable GCS_BUCKET esté configurada correctamente.`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const blob = this.bucket.file(`images/${Date.now()}-${filename}`);

      await blob.save(file, {
        contentType,
        resumable: false,
      });

      const publicUrl = `https://storage.googleapis.com/${this.bucket.name}/${blob.name}`;
      this.logger.debug(`Archivo subido exitosamente: ${publicUrl}`);
      
      return publicUrl;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      
      this.logger.error(`Error al subir archivo a GCS: ${error?.message}`);
      
      // Manejar errores específicos de GCS
      if (error?.message?.includes('does not exist')) {
        throw new HttpException(
          `El bucket "${this.bucketName}" no existe. Por favor, crea el bucket en Google Cloud Storage o verifica que la variable GCS_BUCKET esté configurada correctamente.`,
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      
      if (error?.message?.includes('ENOTFOUND') || error?.message?.includes('getaddrinfo')) {
        throw new HttpException(
          'Error de conectividad con Google Cloud Storage. Verifica tu conexión a internet y que las credenciales estén configuradas correctamente.',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
      
      throw new HttpException(
        `Error al subir archivo a Google Cloud Storage: ${error?.message || 'Error desconocido'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
