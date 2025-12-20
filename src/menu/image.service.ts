import { Injectable, BadRequestException } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import { ItemsService } from './items.service';

@Injectable()
export class ImageService {
  private readonly uploadDir = 'uploads';
  private readonly thumbnailSize = 300;
  private readonly displaySize = 800;

  constructor(private readonly itemsService: ItemsService) {}

  async processAndSaveImage(
    menuItemId: number,
    file: Express.Multer.File,
  ): Promise<any> {
    // Validate file type
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('File must be an image');
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size must be less than 5MB');
    }

    // Create upload directory if it doesn't exist
    await fs.mkdir(this.uploadDir, { recursive: true });

    // Generate unique filename
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const extension = path.extname(file.originalname);
    const baseName = `${timestamp}_${random}`;

    const originalPath = path.join(this.uploadDir, `${baseName}_original${extension}`);
    const thumbnailPath = path.join(this.uploadDir, `${baseName}_thumbnail.jpg`);
    const displayPath = path.join(this.uploadDir, `${baseName}_display.jpg`);

    try {
      // Save original file
      await fs.writeFile(originalPath, file.buffer);

      // Process images with Sharp
      const sharpInstance = sharp(file.buffer);

      // Create thumbnail (300x300, cropped)
      await sharpInstance
        .resize(this.thumbnailSize, this.thumbnailSize, {
          fit: 'cover',
          position: 'center',
        })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath);

      // Create display image (800x800, contain)
      await sharpInstance
        .resize(this.displaySize, this.displaySize, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 85 })
        .toFile(displayPath);

      // Determine format
      const format = extension.substring(1).toLowerCase();
      const allowedFormats = ['jpeg', 'jpg', 'png', 'webp'];
      const normalizedFormat = allowedFormats.includes(format) ? format : 'jpeg';

      // Save to database
      const imageData = {
        original_url: `/${originalPath}`,
        thumbnail_url: `/${thumbnailPath}`,
        display_url: `/${displayPath}`,
        file_size: file.size,
        format: normalizedFormat,
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
      // Clean up files on error
      await this.cleanupFiles([originalPath, thumbnailPath, displayPath]);
      throw new BadRequestException('Failed to process image');
    }
  }

  private async cleanupFiles(filePaths: string[]): Promise<void> {
    for (const filePath of filePaths) {
      try {
        await fs.unlink(filePath);
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }
}