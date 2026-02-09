export interface FileStoragePort {
    upload(
      file: Buffer,
      filename: string,
      contentType: string
    ): Promise<string>;
  }