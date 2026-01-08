import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import type {
  UpdateSettingDto,
  BulkUpdateSettingsDto,
} from './system-settings.service';
import { SystemSettingsService } from './system-settings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.guard';
import * as schema from '../db/schema';
import { GcsService } from '../menu/gcs.service';
import * as path from 'path';
import sharp from 'sharp';

@Controller('system-settings')
export class SystemSettingsController {
  constructor(
    private readonly systemSettingsService: SystemSettingsService,
    private readonly gcsService: GcsService,
  ) {}

  /**
   * Get public settings (no auth required)
   */
  @Get('public')
  async getPublicSettings() {
    return this.systemSettingsService.getPublicSettings();
  }

  /**
   * Get branding settings (no auth required)
   */
  @Get('branding')
  async getBrandingSettings() {
    return this.systemSettingsService.getBrandingSettings();
  }

  /**
   * Get all settings (super admin only)
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  async getAllSettings(@Query('includePrivate') includePrivate?: string) {
    return this.systemSettingsService.getAllSettings(
      includePrivate === 'true',
    );
  }

  /**
   * Get settings by category (admin/super_admin only)
   */
  @Get('category/:category')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  async getSettingsByCategory(
    @Param('category') category: string,
    @Query('includePrivate') includePrivate?: string,
  ) {
    return this.systemSettingsService.getSettingsByCategory(
      category,
      includePrivate === 'true',
    );
  }

  /**
   * Get workflow settings (admin/super_admin only)
   */
  @Get('workflow/config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  async getWorkflowSettings() {
    return this.systemSettingsService.getWorkflowSettings();
  }

  /**
   * Get a single setting by key (super admin only)
   */
  @Get(':key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  async getSettingByKey(@Param('key') key: string) {
    return this.systemSettingsService.getSettingByKey(key);
  }

  /**
   * Update a single setting (super admin only)
   */
  @Put(':key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  async updateSetting(
    @Param('key') key: string,
    @Body('value') value: string,
    @Req() req: any,
  ) {
    return this.systemSettingsService.updateSetting({
      key,
      value,
      updatedBy: req.user.userId,
    });
  }

  /**
   * Bulk update settings (super admin only)
   */
  @Put()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  async bulkUpdateSettings(@Body() dto: BulkUpdateSettingsDto, @Req() req: any) {
    return this.systemSettingsService.bulkUpdateSettings({
      ...dto,
      updatedBy: req.user.userId,
    });
  }

  /**
   * Create a new setting (super admin only)
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  async createSetting(
    @Body() data: Omit<schema.NewSystemSetting, 'created_at' | 'updated_at'>,
    @Req() req: any,
  ) {
    return this.systemSettingsService.createSetting({
      ...data,
      updated_by: req.user.userId,
    });
  }

  /**
   * Delete a setting (super admin only)
   */
  @Delete(':key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  async deleteSetting(@Param('key') key: string) {
    await this.systemSettingsService.deleteSetting(key);
    return { message: 'Setting deleted successfully' };
  }

  /**
   * Generate signed URL for logo upload (super admin only)
   */
  @Post('logo/upload-url')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  async getLogoUploadUrl(
    @Body() body: { fileName: string; contentType: string },
  ) {
    // Generate unique filename
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const extension = path.extname(body.fileName);
    const baseName = `logos/${timestamp}_${random}${extension}`;

    const signedUrl = await this.gcsService.generateSignedUploadUrl(
      baseName,
      body.contentType,
    );

    return {
      signedUrl,
      fileName: baseName,
    };
  }

  /**
   * Confirm logo upload and process image (super admin only)
   */
  @Post('logo/confirm')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  async confirmLogoUpload(
    @Body() body: { gcsFileName: string },
    @Req() req: any,
  ) {
    try {
      // Download image from GCS for processing
      const bucket = this.gcsService.getBucket();
      const file = bucket.file(body.gcsFileName);
      const [buffer] = await file.download();

      // Process image with Sharp
      const sharpInstance = sharp(buffer);

      // Generate processed filenames
      const baseName = path.parse(body.gcsFileName).name;
      const displayName = `logos/${baseName}_display.jpg`;

      // Create display image (500x500, contain)
      const displayBuffer = await sharpInstance
        .resize(500, 500, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 85 })
        .toBuffer();

      // Upload processed image to GCS
      const displayFile = bucket.file(displayName);
      await displayFile.save(displayBuffer, {
        metadata: {
          contentType: 'image/jpeg',
        },
      });

      // Generate public URLs
      const displayUrl = this.gcsService.getPublicUrl(displayName);

      // Update system setting with new logo URL
      await this.systemSettingsService.updateSetting({
        key: 'restaurant_logo_url',
        value: displayUrl,
        updatedBy: req.user.userId,
      });

      // Delete original upload
      await this.gcsService.deleteFile(body.gcsFileName);

      return {
        success: true,
        url: displayUrl,
        message: 'Logo uploaded and updated successfully',
      };
    } catch (error) {
      throw new Error(`Failed to process logo: ${error.message}`);
    }
  }
}
