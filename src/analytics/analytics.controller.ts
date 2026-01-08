import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * Get revenue breakdown by menu items
   * GET /api/analytics/revenue-by-menu-items
   */
  @Get('revenue-by-menu-items')
  async getRevenueByMenuItems(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
  ) {
    return this.analyticsService.getRevenueByMenuItems(
      startDate,
      endDate,
      limit ? parseInt(limit) : 20,
    );
  }

  /**
   * Get revenue breakdown by tables
   * GET /api/analytics/revenue-by-tables
   */
  @Get('revenue-by-tables')
  async getRevenueByTables(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getRevenueByTables(startDate, endDate);
  }

  /**
   * Get daily order activity/traffic
   * GET /api/analytics/daily-activity
   */
  @Get('daily-activity')
  async getDailyActivity(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getDailyActivity(startDate, endDate);
  }

  /**
   * Get total revenue for the month
   * GET /api/analytics/monthly-revenue
   */
  @Get('monthly-revenue')
  async getMonthlyRevenue(
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    return this.analyticsService.getMonthlyRevenue(
      year ? parseInt(year) : new Date().getFullYear(),
      month ? parseInt(month) : new Date().getMonth() + 1,
    );
  }

  /**
   * Get popular menu items by order count
   * GET /api/analytics/popular-items
   */
  @Get('popular-items')
  async getPopularItems(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
  ) {
    return this.analyticsService.getPopularItems(
      startDate,
      endDate,
      limit ? parseInt(limit) : 10,
    );
  }

  /**
   * Get overall analytics summary
   * GET /api/analytics/summary
   */
  @Get('summary')
  async getAnalyticsSummary(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getAnalyticsSummary(startDate, endDate);
  }
}
