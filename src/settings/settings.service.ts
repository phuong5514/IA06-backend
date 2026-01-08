import { Injectable } from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';
import { db } from '../db';
import { systemSettings } from '../db/schema';

export interface SystemSettings {
  restaurantName: string;
  maxTableCapacity: number;
  orderTimeout: number;
  enableNotifications: boolean;
  maintenanceMode: boolean;
  themePrimaryColor?: string;
  themeSecondaryColor?: string;
  restaurantLogoUrl?: string;
  defaultSeatsPerTable?: number;
  orderAutoAcceptEnabled?: boolean;
  kitchenPreparationAlertTime?: number;
}

@Injectable()
export class SettingsService {
  private readonly SETTING_KEYS = {
    RESTAURANT_NAME: 'restaurant_name',
    MAX_TABLE_CAPACITY: 'max_table_capacity',
    ORDER_TIMEOUT: 'order_timeout',
    ENABLE_NOTIFICATIONS: 'enable_notifications',
    MAINTENANCE_MODE: 'maintenance_mode',
    THEME_PRIMARY_COLOR: 'theme_primary_color',
    THEME_SECONDARY_COLOR: 'theme_secondary_color',
    RESTAURANT_LOGO_URL: 'restaurant_logo_url',
    DEFAULT_SEATS_PER_TABLE: 'default_seats_per_table',
    ORDER_AUTO_ACCEPT_ENABLED: 'order_auto_accept_enabled',
    KITCHEN_PREPARATION_ALERT_TIME: 'kitchen_preparation_alert_time',
  };

  async getSettings(): Promise<SystemSettings> {
    try {
      const settingKeys = Object.values(this.SETTING_KEYS);
      const settings = await db
        .select()
        .from(systemSettings)
        .where(inArray(systemSettings.key, settingKeys));

      // Convert key-value pairs to settings object
      const settingsMap = new Map(
        settings.map(s => [s.key, s.value])
      );

      return {
        restaurantName: settingsMap.get(this.SETTING_KEYS.RESTAURANT_NAME) || 'Smart Restaurant',
        maxTableCapacity: parseInt(settingsMap.get(this.SETTING_KEYS.MAX_TABLE_CAPACITY) || '20'),
        orderTimeout: parseInt(settingsMap.get(this.SETTING_KEYS.ORDER_TIMEOUT) || '30'),
        enableNotifications: settingsMap.get(this.SETTING_KEYS.ENABLE_NOTIFICATIONS) === 'true',
        maintenanceMode: settingsMap.get(this.SETTING_KEYS.MAINTENANCE_MODE) === 'true',
        themePrimaryColor: settingsMap.get(this.SETTING_KEYS.THEME_PRIMARY_COLOR) || '#4F46E5',
        themeSecondaryColor: settingsMap.get(this.SETTING_KEYS.THEME_SECONDARY_COLOR) || '#10B981',
        restaurantLogoUrl: settingsMap.get(this.SETTING_KEYS.RESTAURANT_LOGO_URL) || '',
        defaultSeatsPerTable: parseInt(settingsMap.get(this.SETTING_KEYS.DEFAULT_SEATS_PER_TABLE) || '4'),
        orderAutoAcceptEnabled: settingsMap.get(this.SETTING_KEYS.ORDER_AUTO_ACCEPT_ENABLED) === 'true',
        kitchenPreparationAlertTime: parseInt(settingsMap.get(this.SETTING_KEYS.KITCHEN_PREPARATION_ALERT_TIME) || '15'),
      };
    } catch (error) {
      console.error('Error fetching settings:', error);
      throw new Error('Failed to fetch settings from database');
    }
  }

  async updateSettings(data: SystemSettings, updatedBy?: string): Promise<SystemSettings> {
    try {
      const settingsToUpdate = [
        {
          key: this.SETTING_KEYS.RESTAURANT_NAME,
          value: data.restaurantName,
          description: 'Restaurant display name',
          category: 'branding',
        },
        {
          key: this.SETTING_KEYS.MAX_TABLE_CAPACITY,
          value: data.maxTableCapacity.toString(),
          description: 'Maximum number of tables in the restaurant',
          category: 'general',
        },
        {
          key: this.SETTING_KEYS.ORDER_TIMEOUT,
          value: data.orderTimeout.toString(),
          description: 'Order timeout in minutes',
          category: 'workflow',
        },
        {
          key: this.SETTING_KEYS.ENABLE_NOTIFICATIONS,
          value: data.enableNotifications.toString(),
          description: 'Enable system notifications',
          category: 'general',
        },
        {
          key: this.SETTING_KEYS.MAINTENANCE_MODE,
          value: data.maintenanceMode.toString(),
          description: 'Enable maintenance mode',
          category: 'advanced',
        },
      ];

      // Add optional settings if provided
      if (data.themePrimaryColor !== undefined) {
        settingsToUpdate.push({
          key: this.SETTING_KEYS.THEME_PRIMARY_COLOR,
          value: data.themePrimaryColor,
          description: 'Primary theme color',
          category: 'branding',
        });
      }
      if (data.themeSecondaryColor !== undefined) {
        settingsToUpdate.push({
          key: this.SETTING_KEYS.THEME_SECONDARY_COLOR,
          value: data.themeSecondaryColor,
          description: 'Secondary theme color',
          category: 'branding',
        });
      }
      if (data.restaurantLogoUrl !== undefined) {
        settingsToUpdate.push({
          key: this.SETTING_KEYS.RESTAURANT_LOGO_URL,
          value: data.restaurantLogoUrl,
          description: 'Restaurant logo URL',
          category: 'branding',
        });
      }
      if (data.defaultSeatsPerTable !== undefined) {
        settingsToUpdate.push({
          key: this.SETTING_KEYS.DEFAULT_SEATS_PER_TABLE,
          value: data.defaultSeatsPerTable.toString(),
          description: 'Default seats per table',
          category: 'workflow',
        });
      }
      if (data.orderAutoAcceptEnabled !== undefined) {
        settingsToUpdate.push({
          key: this.SETTING_KEYS.ORDER_AUTO_ACCEPT_ENABLED,
          value: data.orderAutoAcceptEnabled.toString(),
          description: 'Automatically accept orders',
          category: 'workflow',
        });
      }
      if (data.kitchenPreparationAlertTime !== undefined) {
        settingsToUpdate.push({
          key: this.SETTING_KEYS.KITCHEN_PREPARATION_ALERT_TIME,
          value: data.kitchenPreparationAlertTime.toString(),
          description: 'Kitchen preparation alert time in minutes',
          category: 'workflow',
        });
      }

      // Upsert each setting
      for (const setting of settingsToUpdate) {
        const existing = await db
          .select()
          .from(systemSettings)
          .where(eq(systemSettings.key, setting.key))
          .limit(1);

        if (existing.length > 0) {
          await db
            .update(systemSettings)
            .set({
              value: setting.value,
              updated_by: updatedBy || null,
            })
            .where(eq(systemSettings.key, setting.key));
        } else {
          await db
            .insert(systemSettings)
            .values({
              key: setting.key,
              value: setting.value,
              description: setting.description,
              category: setting.category,
              is_public: false,
              updated_by: updatedBy || null,
            });
        }
      }

      return data;
    } catch (error) {
      console.error('Error updating settings:', error);
      throw new Error(`Failed to update settings: ${error.message}`);
    }
  }

  private getDefaultSettings(): SystemSettings {
    return {
      restaurantName: 'Smart Restaurant',
      maxTableCapacity: 20,
      orderTimeout: 30,
      enableNotifications: true,
      maintenanceMode: false,
      themePrimaryColor: '#4F46E5',
      themeSecondaryColor: '#10B981',
      restaurantLogoUrl: '',
      defaultSeatsPerTable: 4,
      orderAutoAcceptEnabled: false,
      kitchenPreparationAlertTime: 15,
    };
  }

  /**
   * Get a specific setting value by key
   */
  async getSettingValue(key: string): Promise<string | null> {
    const setting = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, key))
      .limit(1);

    return setting.length > 0 ? setting[0].value : null;
  }
}
