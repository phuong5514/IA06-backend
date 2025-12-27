import { Injectable } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';

@Injectable()
export class GcsService {
  private storage: Storage;
  private bucketName: string;

  constructor() {
    this.bucketName = process.env.GCS_BUCKET_NAME || 'smart-restaurant-images';
    const config: any = {
      projectId: process.env.GCS_PROJECT_ID,
    };
    if (process.env.GCS_KEY_JSON) {
      config.credentials = JSON.parse(process.env.GCS_KEY_JSON);
    } else {
      config.keyFilename = process.env.GCS_KEY_FILE;
    }
    this.storage = new Storage(config);
  }

  async generateSignedUploadUrl(
    fileName: string,
    contentType: string,
  ): Promise<string> {
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(fileName);

    const options = {
      version: 'v4' as const,
      action: 'write' as const,
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      contentType: contentType,
    };

    const [url] = await file.getSignedUrl(options);
    return url;
  }

  getPublicUrl(fileName: string): string {
    return `https://storage.googleapis.com/${this.bucketName}/${fileName}`;
  }

  async deleteFile(fileName: string): Promise<void> {
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(fileName);
    await file.delete();
  }
}
