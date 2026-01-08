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

@Controller('system-settings')
export class SystemSettingsController {
  constructor(
    private readonly systemSettingsService: SystemSettingsService,
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
}
