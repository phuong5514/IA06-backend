import { Injectable } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { eq, desc, and, gte, lte, sql } from 'drizzle-orm';

export interface CreateAuditLogDto {
  userId?: string;
  userEmail?: string;
  userRole?: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  description: string;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLogFilters {
  userId?: string;
  action?: string;
  resourceType?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class AuditLogsService {
  private db;

  constructor() {
    this.db = drizzle(process.env.DATABASE_URL);
  }

  /**
   * Create a new audit log entry
   */
  async createLog(data: CreateAuditLogDto): Promise<schema.AuditLog> {
    const logData: schema.NewAuditLog = {
      user_id: data.userId,
      user_email: data.userEmail,
      user_role: data.userRole,
      action: data.action,
      resource_type: data.resourceType,
      resource_id: data.resourceId,
      description: data.description,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      ip_address: data.ipAddress,
      user_agent: data.userAgent,
    };

    const [result] = await this.db
      .insert(schema.auditLogs)
      .values(logData)
      .returning();

    return result;
  }

  /**
   * Get audit logs with filters and pagination
   */
  async getLogs(filters: AuditLogFilters = {}) {
    const {
      userId,
      action,
      resourceType,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 50,
    } = filters;

    // Build conditions
    const conditions = [];

    if (userId) {
      conditions.push(eq(schema.auditLogs.user_id, userId));
    }

    if (action) {
      conditions.push(eq(schema.auditLogs.action, action));
    }

    if (resourceType) {
      conditions.push(eq(schema.auditLogs.resource_type, resourceType));
    }

    if (startDate) {
      conditions.push(gte(schema.auditLogs.created_at, startDate));
    }

    if (endDate) {
      conditions.push(lte(schema.auditLogs.created_at, endDate));
    }

    if (search) {
      conditions.push(
        sql`${schema.auditLogs.description} ILIKE ${`%${search}%`} OR ${schema.auditLogs.user_email} ILIKE ${`%${search}%`}`,
      );
    }

    // Get total count
    const countQuery = this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.auditLogs);

    if (conditions.length > 0) {
      countQuery.where(and(...conditions));
    }

    const [{ count: total }] = await countQuery;

    // Get paginated results
    const offset = (page - 1) * limit;
    const logsQuery = this.db
      .select()
      .from(schema.auditLogs)
      .orderBy(desc(schema.auditLogs.created_at))
      .limit(limit)
      .offset(offset);

    if (conditions.length > 0) {
      logsQuery.where(and(...conditions));
    }

    const logs = await logsQuery;

    return {
      data: logs,
      pagination: {
        page,
        limit,
        total: Number(total),
        totalPages: Math.ceil(Number(total) / limit),
      },
    };
  }

  /**
   * Get audit log statistics
   */
  async getStatistics(startDate?: string, endDate?: string) {
    const conditions = [];

    if (startDate) {
      conditions.push(gte(schema.auditLogs.created_at, startDate));
    }

    if (endDate) {
      conditions.push(lte(schema.auditLogs.created_at, endDate));
    }

    // Total logs
    const totalQuery = this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.auditLogs);

    if (conditions.length > 0) {
      totalQuery.where(and(...conditions));
    }

    const [{ count: totalLogs }] = await totalQuery;

    // Actions breakdown
    const actionStatsQuery = this.db
      .select({
        action: schema.auditLogs.action,
        count: sql<number>`count(*)`,
      })
      .from(schema.auditLogs)
      .groupBy(schema.auditLogs.action);

    if (conditions.length > 0) {
      actionStatsQuery.where(and(...conditions));
    }

    const actionStats = await actionStatsQuery;

    // Resource type breakdown
    const resourceStatsQuery = this.db
      .select({
        resourceType: schema.auditLogs.resource_type,
        count: sql<number>`count(*)`,
      })
      .from(schema.auditLogs)
      .where(sql`${schema.auditLogs.resource_type} IS NOT NULL`)
      .groupBy(schema.auditLogs.resource_type);

    if (conditions.length > 0) {
      resourceStatsQuery.where(and(...conditions));
    }

    const resourceStats = await resourceStatsQuery;

    // Top active users
    const topUsersQuery = this.db
      .select({
        userId: schema.auditLogs.user_id,
        userEmail: schema.auditLogs.user_email,
        userRole: schema.auditLogs.user_role,
        count: sql<number>`count(*)`,
      })
      .from(schema.auditLogs)
      .where(sql`${schema.auditLogs.user_id} IS NOT NULL`)
      .groupBy(
        schema.auditLogs.user_id,
        schema.auditLogs.user_email,
        schema.auditLogs.user_role,
      )
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    if (conditions.length > 0) {
      topUsersQuery.where(and(...conditions));
    }

    const topUsers = await topUsersQuery;

    return {
      totalLogs: Number(totalLogs),
      actionBreakdown: actionStats.map((stat) => ({
        action: stat.action,
        count: Number(stat.count),
      })),
      resourceBreakdown: resourceStats.map((stat) => ({
        resourceType: stat.resourceType,
        count: Number(stat.count),
      })),
      topUsers: topUsers.map((user) => ({
        userId: user.userId,
        userEmail: user.userEmail,
        userRole: user.userRole,
        count: Number(user.count),
      })),
    };
  }

  /**
   * Get a single audit log by ID
   */
  async getLogById(id: number): Promise<schema.AuditLog | null> {
    const [log] = await this.db
      .select()
      .from(schema.auditLogs)
      .where(eq(schema.auditLogs.id, id))
      .limit(1);

    return log || null;
  }
}
