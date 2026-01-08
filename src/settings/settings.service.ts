import { Injectable } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { systemSettings } from '../db/schema';

export interface SystemSettings {
  restaurantName: string;
  maxTableCapacity: number;
  orderTimeout: number;
  enableNotifications: boolean;
  maintenanceMode: boolean;
}

@Injectable()
export class SettingsService {
  private db = drizzle(process.env.DATABASE_URL!);

  async getSettings(): Promise<SystemSettings> {
    try {
      const settings = await this.db
        .select()
        .from(systemSettings)
        .limit(1)
        .execute();

      if (settings.length > 0) {
        return {
          restaurantName: settings[0].restaurant_name,
          maxTableCapacity: settings[0].max_table_capacity,
          orderTimeout: settings[0].order_timeout,
          enableNotifications: settings[0].enable_notifications,
          maintenanceMode: settings[0].maintenance_mode,
        };
      }

      // Return defaults if no settings exist
      return this.getDefaultSettings();
    } catch (error) {
      console.error('Error fetching settings:', error);
      return this.getDefaultSettings();
    }
  }

  async updateSettings(data: SystemSettings): Promise<SystemSettings> {
    try {
      const existing = await this.db
        .select()
        .from(systemSettings)
        .limit(1)
        .execute();

      const settingsData = {
        restaurant_name: data.restaurantName,
        max_table_capacity: data.maxTableCapacity,
        order_timeout: data.orderTimeout,
        enable_notifications: data.enableNotifications,
        maintenance_mode: data.maintenanceMode,
        updated_at: new Date().toISOString(),
      };

      if (existing.length > 0) {
        // Update existing settings
        await this.db
          .update(systemSettings)
          .set(settingsData)
          .where(eq(systemSettings.id, existing[0].id))
          .execute();
      } else {
        // Insert new settings
        await this.db
          .insert(systemSettings)
          .values({
            ...settingsData,
            created_at: new Date().toISOString(),
          })
          .execute();
      }

      return data;
    } catch (error) {
      console.error('Error updating settings:', error);
      throw new Error('Failed to update settings');
    }
  }

  private getDefaultSettings(): SystemSettings {
    return {
      restaurantName: 'Smart Restaurant',
      maxTableCapacity: 20,
      orderTimeout: 30,
      enableNotifications: true,
      maintenanceMode: false,
    };
  }
}
