import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { LocationsService } from './locations.service';
import type { Location, NewLocation } from '../db/schema';

@Controller('admin/locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  /**
   * Create a new location
   * POST /api/admin/locations
   */
  @Post()
  async createLocation(@Body() data: NewLocation): Promise<Location> {
    return await this.locationsService.createLocation(data);
  }

  /**
   * Get all locations
   * GET /api/admin/locations
   */
  @Get()
  async getAllLocations(): Promise<Location[]> {
    return await this.locationsService.getAllLocations();
  }

  /**
   * Get location by ID
   * GET /api/admin/locations/:id
   */
  @Get(':id')
  async getLocationById(@Param('id', ParseIntPipe) id: number): Promise<Location> {
    return await this.locationsService.getLocationById(id);
  }

  /**
   * Update location
   * PUT /api/admin/locations/:id
   */
  @Put(':id')
  async updateLocation(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: Partial<NewLocation>
  ): Promise<Location> {
    return await this.locationsService.updateLocation(id, data);
  }

  /**
   * Delete location
   * DELETE /api/admin/locations/:id
   */
  @Delete(':id')
  async deleteLocation(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return await this.locationsService.deleteLocation(id);
  }

  /**
   * Get tables in a location
   * GET /api/admin/locations/:id/tables
   */
  @Get(':id/tables')
  async getTablesInLocation(@Param('id', ParseIntPipe) id: number) {
    return await this.locationsService.getTablesInLocation(id);
  }

  /**
   * Assign table to location
   * POST /api/admin/locations/assign-table
   */
  @Post('assign-table')
  async assignTableToLocation(
    @Body() data: { tableId: number; locationId?: number; positionX?: number; positionY?: number }
  ) {
    return await this.locationsService.assignTableToLocation(
      data.tableId,
      data.locationId || null,
      data.positionX,
      data.positionY
    );
  }

  /**
   * Get unassigned tables
   * GET /api/admin/locations/unassigned-tables
   */
  @Get('unassigned-tables')
  async getUnassignedTables() {
    return await this.locationsService.getUnassignedTables();
  }
}