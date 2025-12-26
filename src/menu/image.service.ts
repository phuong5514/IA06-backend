import { Injectable, BadRequestException } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import { ItemsService } from './items.service';
import { GcsService } from './gcs.service';

@Injectable()
export class ImageService {
  private readonly thumbnailSize = 300;
  private readonly displaySize = 800;

  constructor(
    private readonly itemsService: ItemsService,
    private readonly gcsService: GcsService,
  ) {}

  async generateUploadUrl(fileName: string, contentType: string): Promise<{ signedUrl: string; fileName: string }> {
    // Generate unique filename
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const extension = path.extname(fileName);
    const baseName = `menu_items/${timestamp}_${random}${extension}`;

    const signedUrl = await this.gcsService.generateSignedUploadUrl(baseName, contentType);

    return {
      signedUrl,
      fileName: baseName,
    };
  }

  async confirmImageUpload(menuItemId: number, gcsFileName: string): Promise<any> {
    try {
      // Download image from GCS for processing
      const bucket = this.gcsService['storage'].bucket(this.gcsService['bucketName']);
      const file = bucket.file(gcsFileName);
      const [buffer] = await file.download();

      // Process images with Sharp
      const sharpInstance = sharp(buffer);

      // Get image metadata
      const metadata = await sharpInstance.metadata();

      // Generate processed filenames
      const baseName = path.parse(gcsFileName).name;
      const thumbnailName = `menu_items/${baseName}_thumbnail.jpg`;
      const displayName = `menu_items/${baseName}_display.jpg`;

      // Create thumbnail (300x300, cropped)
      const thumbnailBuffer = await sharpInstance
        .resize(this.thumbnailSize, this.thumbnailSize, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({ quality: 80 })
        .toBuffer();

      // Create display image (800x800, contain)
      const displayBuffer = await sharpInstance
        .resize(this.displaySize, this.displaySize, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 85 })
        .toBuffer();

      // Upload processed images to GCS
      const thumbnailFile = bucket.file(thumbnailName);
      const displayFile = bucket.file(displayName);

      await Promise.all([
        thumbnailFile.save(thumbnailBuffer, { contentType: 'image/jpeg' }),
        displayFile.save(displayBuffer, { contentType: 'image/jpeg' }),
      ]);

      // Save to database
      const imageData = {
        original_url: this.gcsService.getPublicUrl(gcsFileName),
        thumbnail_url: this.gcsService.getPublicUrl(thumbnailName),
        display_url: this.gcsService.getPublicUrl(displayName),
        file_size: buffer.length,
        format: metadata.format || 'jpeg',
      };

      const savedImage = await this.itemsService.addImage(menuItemId, imageData);

      return {
        id: savedImage.id,
        urls: {
          original: savedImage.original_url,
          thumbnail: savedImage.thumbnail_url,
          display: savedImage.display_url,
        },
      };
    } catch (error) {
      console.error('Failed to process image from GCS:', error);
      throw new BadRequestException('Failed to process uploaded image');
    }
  }


}
