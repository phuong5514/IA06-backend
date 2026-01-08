import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import type { CreateAuditLogDto, AuditLogFilters } from './audit-logs.service';
import { AuditLogsService } from './audit-logs.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.guard';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  /**
   * Create a new audit log (for manual logging if needed)
   */
  @Post()
  @Roles('admin', 'super_admin')
  async createLog(@Body() dto: CreateAuditLogDto, @Req() req: any) {
    return this.auditLogsService.createLog({
      ...dto,
      userId: dto.userId || req.user.userId,
      userEmail: dto.userEmail || req.user.email,
      userRole: dto.userRole || req.user.role,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  /**
   * Get audit logs with filters
   */
  @Get()
  @Roles('admin', 'super_admin', 'waiter', 'kitchen')
  async getLogs(@Query() filters: AuditLogFilters) {
    // Parse numeric values
    if (filters.page) {
      filters.page = Number(filters.page);
    }
    if (filters.limit) {
      filters.limit = Number(filters.limit);
    }

    return this.auditLogsService.getLogs(filters);
  }

  /**
   * Get audit log statistics
   */
  @Get('statistics')
  @Roles('admin', 'super_admin')
  async getStatistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.auditLogsService.getStatistics(startDate, endDate);
  }

  /**
   * Get a single audit log by ID
   */
  @Get(':id')
  @Roles('admin', 'super_admin')
  async getLogById(@Param('id') id: string) {
    return this.auditLogsService.getLogById(Number(id));
  }
}
