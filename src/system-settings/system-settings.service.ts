import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { eq, and, inArray } from 'drizzle-orm';

export interface UpdateSettingDto {
  key: string;
  value: string;
  updatedBy: string;
}

export interface BulkUpdateSettingsDto {
  settings: Array<{ key: string; value: string }>;
  updatedBy: string;
}

@Injectable()
export class SystemSettingsService {
  private db;

  constructor() {
    this.db = drizzle(process.env.DATABASE_URL);
  }

  /**
   * Get all system settings
   */
  async getAllSettings(includePrivate = false) {
    let query = this.db.select().from(schema.systemSettings);

    if (!includePrivate) {
      query = query.where(eq(schema.systemSettings.is_public, true));
    }

    const settings = await query;

    // Convert to key-value object for easier use
    const settingsObject = settings.reduce((acc, setting) => {
      acc[setting.key] = {
        value: setting.value,
        description: setting.description,
        category: setting.category,
        updatedAt: setting.updated_at,
      };
      return acc;
    }, {});

    return {
      settings: settingsObject,
      raw: settings,
    };
  }

  /**
   * Get settings by category
   */
  async getSettingsByCategory(category: string, includePrivate = false) {
    let query = this.db
      .select()
      .from(schema.systemSettings)
      .where(eq(schema.systemSettings.category, category));

    if (!includePrivate) {
      query = query.where(
        and(
          eq(schema.systemSettings.category, category),
          eq(schema.systemSettings.is_public, true),
        ),
      );
    }

    return await query;
  }

  /**
   * Get a single setting by key
   */
  async getSettingByKey(key: string): Promise<schema.SystemSetting | null> {
    const [setting] = await this.db
      .select()
      .from(schema.systemSettings)
      .where(eq(schema.systemSettings.key, key))
      .limit(1);

    return setting || null;
  }

  /**
   * Get setting value by key
   */
  async getSettingValue(key: string, defaultValue?: string): Promise<string> {
    const setting = await this.getSettingByKey(key);
    return setting ? setting.value : (defaultValue || '');
  }

  /**
   * Update a system setting
   */
  async updateSetting(dto: UpdateSettingDto): Promise<schema.SystemSetting> {
    const existing = await this.getSettingByKey(dto.key);

    if (!existing) {
      throw new NotFoundException(`Setting with key '${dto.key}' not found`);
    }

    const [updated] = await this.db
      .update(schema.systemSettings)
      .set({
        value: dto.value,
        updated_by: dto.updatedBy,
        updated_at: new Date().toISOString(),
      })
      .where(eq(schema.systemSettings.key, dto.key))
      .returning();

    return updated;
  }

  /**
   * Bulk update multiple settings
   */
  async bulkUpdateSettings(dto: BulkUpdateSettingsDto) {
    const keys = dto.settings.map((s) => s.key);

    // Verify all keys exist
    const existing = await this.db
      .select()
      .from(schema.systemSettings)
      .where(inArray(schema.systemSettings.key, keys));

    if (existing.length !== keys.length) {
      const existingKeys = existing.map((s) => s.key);
      const missingKeys = keys.filter((k) => !existingKeys.includes(k));
      throw new BadRequestException(
        `Settings not found: ${missingKeys.join(', ')}`,
      );
    }

    // Update each setting
    const results = await Promise.all(
      dto.settings.map((setting) =>
        this.updateSetting({
          key: setting.key,
          value: setting.value,
          updatedBy: dto.updatedBy,
        }),
      ),
    );

    return results;
  }

  /**
   * Create a new system setting (admin only)
   */
  async createSetting(
    data: Omit<schema.NewSystemSetting, 'created_at' | 'updated_at'>,
  ): Promise<schema.SystemSetting> {
    const existing = await this.getSettingByKey(data.key);

    if (existing) {
      throw new BadRequestException(`Setting with key '${data.key}' already exists`);
    }

    const [created] = await this.db
      .insert(schema.systemSettings)
      .values(data)
      .returning();

    return created;
  }

  /**
   * Delete a system setting (admin only, use with caution)
   */
  async deleteSetting(key: string): Promise<void> {
    const existing = await this.getSettingByKey(key);

    if (!existing) {
      throw new NotFoundException(`Setting with key '${key}' not found`);
    }

    await this.db
      .delete(schema.systemSettings)
      .where(eq(schema.systemSettings.key, key));
  }

  /**
   * Get public settings (for unauthenticated access)
   */
  async getPublicSettings() {
    const settings = await this.db
      .select()
      .from(schema.systemSettings)
      .where(eq(schema.systemSettings.is_public, true));

    return settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});
  }

  /**
   * Get branding settings
   */
  async getBrandingSettings() {
    const settings = await this.getSettingsByCategory('branding', false);

    return {
      restaurantName: settings.find((s) => s.key === 'restaurant_name')?.value || 'My Restaurant',
      primaryColor: settings.find((s) => s.key === 'theme_primary_color')?.value || '#4F46E5',
      secondaryColor: settings.find((s) => s.key === 'theme_secondary_color')?.value || '#10B981',
      logoUrl: settings.find((s) => s.key === 'restaurant_logo_url')?.value || '',
    };
  }

  /**
   * Get workflow settings
   */
  async getWorkflowSettings() {
    const settings = await this.getSettingsByCategory('workflow', true);

    return {
      defaultSeatsPerTable: parseInt(
        settings.find((s) => s.key === 'default_seats_per_table')?.value || '4',
      ),
      orderAutoAcceptEnabled: settings.find((s) => s.key === 'order_auto_accept_enabled')?.value === 'true',
      kitchenPreparationAlertTime: parseInt(
        settings.find((s) => s.key === 'kitchen_preparation_alert_time')?.value || '15',
      ),
    };
  }
}
