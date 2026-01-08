import { Controller, Get, UseGuards } from '@nestjs/common';
import { SystemStatsService } from './system-stats.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.guard';

@Controller('system-stats')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SystemStatsController {
  constructor(private readonly systemStatsService: SystemStatsService) {}

  /**
   * Get comprehensive system statistics
   */
  @Get()
  @Roles('admin', 'super_admin', 'waiter', 'kitchen')
  async getSystemStats() {
    return this.systemStatsService.getSystemStats();
  }

  /**
   * Get dashboard snapshot with all key metrics
   */
  @Get('dashboard')
  @Roles('admin', 'super_admin', 'waiter', 'kitchen')
  async getDashboardSnapshot() {
    return this.systemStatsService.getDashboardSnapshot();
  }

  /**
   * Get active tables information
   */
  @Get('tables')
  @Roles('admin', 'super_admin', 'waiter', 'kitchen')
  async getActiveTablesCount() {
    return this.systemStatsService.getActiveTablesCount();
  }

  /**
   * Get active staff count
   */
  @Get('staff')
  @Roles('admin', 'super_admin')
  async getActiveStaffCount() {
    return this.systemStatsService.getActiveStaffCount();
  }

  /**
   * Get order statistics
   */
  @Get('orders')
  @Roles('admin', 'super_admin', 'waiter', 'kitchen')
  async getOrderStatistics() {
    return this.systemStatsService.getOrderStatistics();
  }

  /**
   * Get active customer sessions
   */
  @Get('customers')
  @Roles('admin', 'super_admin', 'waiter')
  async getActiveCustomerSessions() {
    return this.systemStatsService.getActiveCustomerSessions();
  }

  /**
   * Get recent activity
   */
  @Get('activity')
  @Roles('admin', 'super_admin', 'waiter', 'kitchen')
  async getRecentActivity() {
    return this.systemStatsService.getRecentActivity();
  }
}
