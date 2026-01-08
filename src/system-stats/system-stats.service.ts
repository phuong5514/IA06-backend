import { Injectable } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';
import { eq, and, sql, gte, isNull } from 'drizzle-orm';

@Injectable()
export class SystemStatsService {
  private db;

  constructor() {
    this.db = drizzle(process.env.DATABASE_URL);
  }

  /**
   * Get comprehensive system statistics for dashboard
   */
  async getSystemStats() {
    // Get all stats in parallel
    const [
      activeTables,
      activeStaff,
      orderStats,
      recentActivity,
    ] = await Promise.all([
      this.getActiveTablesCount(),
      this.getActiveStaffCount(),
      this.getOrderStatistics(),
      this.getRecentActivity(),
    ]);

    return {
      tables: activeTables,
      staff: activeStaff,
      orders: orderStats,
      recentActivity,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get active tables information
   */
  async getActiveTablesCount() {
    // Get total tables
    const [{ count: totalTables }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.tables)
      .where(eq(schema.tables.is_active, true));

    // Get tables with active orders
    const [{ count: tablesWithOrders }] = await this.db
      .select({ count: sql<number>`count(DISTINCT ${schema.orders.table_id})` })
      .from(schema.orders)
      .where(
        and(
          sql`${schema.orders.table_id} IS NOT NULL`,
          sql`${schema.orders.status} NOT IN ('completed', 'cancelled')`,
        ),
      );

    const availableTables = Number(totalTables) - Number(tablesWithOrders);

    return {
      total: Number(totalTables),
      occupied: Number(tablesWithOrders),
      available: availableTables,
    };
  }

  /**
   * Get active staff count (logged in today)
   */
  async getActiveStaffCount() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Count staff who logged in today
    const [{ count: activeStaff }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.users)
      .where(
        and(
          sql`${schema.users.role} IN ('admin', 'super_admin', 'waiter', 'kitchen')`,
          eq(schema.users.is_active, true),
          gte(schema.users.last_login, today.toISOString()),
        ),
      );

    // Count total staff
    const [{ count: totalStaff }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.users)
      .where(
        and(
          sql`${schema.users.role} IN ('admin', 'super_admin', 'waiter', 'kitchen')`,
          eq(schema.users.is_active, true),
        ),
      );

    // Count by role
    const staffByRole = await this.db
      .select({
        role: schema.users.role,
        count: sql<number>`count(*)`,
      })
      .from(schema.users)
      .where(
        and(
          sql`${schema.users.role} IN ('admin', 'super_admin', 'waiter', 'kitchen')`,
          eq(schema.users.is_active, true),
          gte(schema.users.last_login, today.toISOString()),
        ),
      )
      .groupBy(schema.users.role);

    return {
      activeToday: Number(activeStaff),
      total: Number(totalStaff),
      byRole: staffByRole.map((item) => ({
        role: item.role,
        count: Number(item.count),
      })),
    };
  }

  /**
   * Get order statistics
   */
  async getOrderStatistics() {
    // Count orders by status
    const ordersByStatus = await this.db
      .select({
        status: schema.orders.status,
        count: sql<number>`count(*)`,
      })
      .from(schema.orders)
      .where(
        sql`${schema.orders.status} NOT IN ('completed', 'cancelled')`,
      )
      .groupBy(schema.orders.status);

    // Count total items across all active orders
    const [{ count: totalItemsOrdered }] = await this.db
      .select({ count: sql<number>`sum(${schema.orderItems.quantity})` })
      .from(schema.orderItems)
      .innerJoin(
        schema.orders,
        eq(schema.orderItems.order_id, schema.orders.id),
      )
      .where(
        sql`${schema.orders.status} NOT IN ('completed', 'cancelled')`,
      );

    // Count items in preparation (orders that are accepted or preparing)
    const [{ count: itemsPreparing }] = await this.db
      .select({ count: sql<number>`sum(${schema.orderItems.quantity})` })
      .from(schema.orderItems)
      .innerJoin(
        schema.orders,
        eq(schema.orderItems.order_id, schema.orders.id),
      )
      .where(
        sql`${schema.orders.status} IN ('accepted', 'preparing')`,
      );

    // Today's completed orders
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [{ count: completedToday }] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.orders)
      .where(
        and(
          eq(schema.orders.status, 'completed'),
          gte(schema.orders.created_at, today.toISOString()),
        ),
      );

    return {
      byStatus: ordersByStatus.map((item) => ({
        status: item.status,
        count: Number(item.count),
      })),
      totalItemsOrdered: Number(totalItemsOrdered) || 0,
      itemsPreparing: Number(itemsPreparing) || 0,
      completedToday: Number(completedToday),
      pending: ordersByStatus.find((s) => s.status === 'pending')?.count || 0,
      preparing: ordersByStatus.find((s) => s.status === 'preparing')?.count || 0,
      ready: ordersByStatus.find((s) => s.status === 'ready')?.count || 0,
    };
  }

  /**
   * Get active customer sessions
   */
  async getActiveCustomerSessions() {
    // Count customers with active orders
    const [{ count: activeCustomers }] = await this.db
      .select({ count: sql<number>`count(DISTINCT ${schema.orders.user_id})` })
      .from(schema.orders)
      .where(
        sql`${schema.orders.status} NOT IN ('completed', 'cancelled')`,
      );

    // Count unique customers today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [{ count: customersToday }] = await this.db
      .select({ count: sql<number>`count(DISTINCT ${schema.orders.user_id})` })
      .from(schema.orders)
      .where(gte(schema.orders.created_at, today.toISOString()));

    return {
      active: Number(activeCustomers),
      today: Number(customersToday),
    };
  }

  /**
   * Get recent activity for dashboard
   */
  async getRecentActivity() {
    // Get recent orders
    const recentOrders = await this.db
      .select({
        id: schema.orders.id,
        status: schema.orders.status,
        totalAmount: schema.orders.total_amount,
        createdAt: schema.orders.created_at,
        updatedAt: schema.orders.updated_at,
        tableNumber: schema.tables.table_number,
      })
      .from(schema.orders)
      .leftJoin(schema.tables, eq(schema.orders.table_id, schema.tables.id))
      .orderBy(sql`${schema.orders.updated_at} DESC`)
      .limit(10);

    return {
      recentOrders,
    };
  }

  /**
   * Get real-time dashboard snapshot
   */
  async getDashboardSnapshot() {
    const [stats, customerSessions] = await Promise.all([
      this.getSystemStats(),
      this.getActiveCustomerSessions(),
    ]);

    return {
      ...stats,
      customers: customerSessions,
    };
  }
}
