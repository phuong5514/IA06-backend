import { Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '../db';
import { locations, Location, NewLocation } from '../db/schema';

@Injectable()
export class LocationsService {
  /**
   * Create a new location
   */
  async createLocation(data: NewLocation): Promise<Location> {
    const [location] = await db.insert(locations).values(data).returning();
    return location;
  }

  /**
   * Get all locations
   */
  async getAllLocations(): Promise<Location[]> {
    return await db.select().from(locations);
  }

  /**
   * Get location by ID
   */
  async getLocationById(id: number): Promise<Location> {
    const [location] = await db
      .select()
      .from(locations)
      .where(eq(locations.id, id));

    if (!location) {
      throw new NotFoundException('Location not found');
    }

    return location;
  }

  /**
   * Update location
   */
  async updateLocation(id: number, data: Partial<NewLocation>): Promise<Location> {
    const [location] = await db
      .update(locations)
      .set({ ...data, updated_at: new Date().toISOString() })
      .where(eq(locations.id, id))
      .returning();

    if (!location) {
      throw new NotFoundException('Location not found');
    }

    return location;
  }

  /**
   * Delete location
   */
  async deleteLocation(id: number): Promise<void> {
    const result = await db
      .delete(locations)
      .where(eq(locations.id, id));

    if (result.rowCount === 0) {
      throw new NotFoundException('Location not found');
    }
  }

  /**
   * Get tables in a location
   */
  async getTablesInLocation(locationId: number) {
    const { tables } = await import('../db/schema.js');
    return await db
      .select()
      .from(tables)
      .where(eq(tables.location_id, locationId));
  }

  /**
   * Assign table to location with position
   */
  async assignTableToLocation(tableId: number, locationId: number | null, positionX?: number, positionY?: number) {
    const { tables } = await import('../db/schema.js');
    const updateData: any = {
      location_id: locationId,
      updated_at: new Date().toISOString()
    };

    if (positionX !== undefined) updateData.position_x = positionX;
    if (positionY !== undefined) updateData.position_y = positionY;

    const [table] = await db
      .update(tables)
      .set(updateData)
      .where(eq(tables.id, tableId))
      .returning();

    if (!table) {
      throw new NotFoundException('Table not found');
    }

    return table;
  }

  /**
   * Get unassigned tables
   */
  async getUnassignedTables() {
    const { tables } = await import('../db/schema.js');
    return await db
      .select()
      .from(tables)
      .where(sql`${tables.location_id} IS NULL`);
  }
}