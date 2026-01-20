import { Injectable } from '@nestjs/common';
import { sql, and, gte, lte, eq, desc } from 'drizzle-orm';
import {
  orders,
  orderItems,
  menuItems,
  tables,
} from '../db/schema';
import { getDrizzleDb } from '../infrastructure/drizzle.provider';

@Injectable()
export class AnalyticsService {
  private db;

  constructor() {
    this.db = getDrizzleDb();
  }

  /**
   * Get revenue breakdown by menu items
   */
  async getRevenueByMenuItems(
    startDate?: string,
    endDate?: string,
    limit: number = 20,
  ) {
    const whereConditions = [
      eq(orders.status, 'completed'),
    ];

    if (startDate) {
      whereConditions.push(gte(orders.created_at, startDate));
    }
    if (endDate) {
      whereConditions.push(lte(orders.created_at, endDate));
    }

    const result = await this.db
      .select({
        menu_item_id: orderItems.menu_item_id,
        menu_item_name: menuItems.name,
        total_quantity: sql<number>`CAST(SUM(${orderItems.quantity}) AS INTEGER)`,
        total_revenue: sql<string>`CAST(SUM(${orderItems.total_price}) AS DECIMAL(10,2))`,
        avg_price: sql<string>`CAST(AVG(${orderItems.unit_price}) AS DECIMAL(10,2))`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.order_id, orders.id))
      .innerJoin(menuItems, eq(orderItems.menu_item_id, menuItems.id))
      .where(and(...whereConditions))
      .groupBy(orderItems.menu_item_id, menuItems.name)
      .orderBy(desc(sql`SUM(${orderItems.total_price})`))
      .limit(limit);

    return {
      data: result,
      total_items: result.length,
    };
  }

  /**
   * Get revenue breakdown by tables
   */
  async getRevenueByTables(startDate?: string, endDate?: string) {
    const whereConditions = [
      eq(orders.status, 'completed'),
    ];

    if (startDate) {
      whereConditions.push(gte(orders.created_at, startDate));
    }
    if (endDate) {
      whereConditions.push(lte(orders.created_at, endDate));
    }

    const result = await this.db
      .select({
        table_id: orders.table_id,
        table_number: tables.table_number,
        total_orders: sql<number>`CAST(COUNT(DISTINCT ${orders.id}) AS INTEGER)`,
        total_revenue: sql<string>`CAST(SUM(${orders.total_amount}) AS DECIMAL(10,2))`,
        avg_order_value: sql<string>`CAST(AVG(${orders.total_amount}) AS DECIMAL(10,2))`,
      })
      .from(orders)
      .leftJoin(tables, eq(orders.table_id, tables.id))
      .where(and(...whereConditions))
      .groupBy(orders.table_id, tables.table_number)
      .orderBy(desc(sql`SUM(${orders.total_amount})`));

    return {
      data: result,
      total_tables: result.length,
    };
  }

  /**
   * Get daily order activity
   */
  async getDailyActivity(startDate?: string, endDate?: string) {
    const whereConditions = [];

    if (startDate) {
      whereConditions.push(gte(orders.created_at, startDate));
    }
    if (endDate) {
      whereConditions.push(lte(orders.created_at, endDate));
    }

    const result = await this.db
      .select({
        date: sql<string>`DATE(${orders.created_at})`,
        total_orders: sql<number>`CAST(COUNT(${orders.id}) AS INTEGER)`,
        completed_orders: sql<number>`CAST(COUNT(CASE WHEN ${orders.status} = 'completed' THEN 1 END) AS INTEGER)`,
        cancelled_orders: sql<number>`CAST(COUNT(CASE WHEN ${orders.status} = 'cancelled' THEN 1 END) AS INTEGER)`,
        pending_orders: sql<number>`CAST(COUNT(CASE WHEN ${orders.status} = 'pending' THEN 1 END) AS INTEGER)`,
        total_revenue: sql<string>`CAST(SUM(CASE WHEN ${orders.status} = 'completed' THEN ${orders.total_amount} ELSE 0 END) AS DECIMAL(10,2))`,
        avg_order_value: sql<string>`CAST(AVG(CASE WHEN ${orders.status} = 'completed' THEN ${orders.total_amount} END) AS DECIMAL(10,2))`,
      })
      .from(orders)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .groupBy(sql`DATE(${orders.created_at})`)
      .orderBy(sql`DATE(${orders.created_at}) DESC`);

    return {
      data: result,
      total_days: result.length,
    };
  }

  /**
   * Get hourly order activity
   */
  async getHourlyActivity(startDate?: string, endDate?: string) {
    const whereConditions = [];

    if (startDate) {
      whereConditions.push(gte(orders.created_at, startDate));
    }
    if (endDate) {
      whereConditions.push(lte(orders.created_at, endDate));
    }

    const result = await this.db
      .select({
        hour: sql<number>`EXTRACT(HOUR FROM DATE_TRUNC('hour', ${orders.created_at}))::INTEGER`,
        date: sql<string>`DATE_TRUNC('hour', ${orders.created_at})::date`,
        datetime: sql<string>`DATE_TRUNC('hour', ${orders.created_at})`,
        total_orders: sql<number>`CAST(COUNT(${orders.id}) AS INTEGER)`,
        completed_orders: sql<number>`CAST(COUNT(CASE WHEN ${orders.status} = 'completed' THEN 1 END) AS INTEGER)`,
        cancelled_orders: sql<number>`CAST(COUNT(CASE WHEN ${orders.status} = 'cancelled' THEN 1 END) AS INTEGER)`,
        pending_orders: sql<number>`CAST(COUNT(CASE WHEN ${orders.status} = 'pending' THEN 1 END) AS INTEGER)`,
        total_revenue: sql<string>`CAST(SUM(CASE WHEN ${orders.status} = 'completed' THEN ${orders.total_amount} ELSE 0 END) AS DECIMAL(10,2))`,
        avg_order_value: sql<string>`CAST(AVG(CASE WHEN ${orders.status} = 'completed' THEN ${orders.total_amount} END) AS DECIMAL(10,2))`,
      })
      .from(orders)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .groupBy(sql`DATE_TRUNC('hour', ${orders.created_at})`)
      .orderBy(sql`DATE_TRUNC('hour', ${orders.created_at}) ASC`);

    return {
      data: result,
      total_records: result.length,
    };
  }

  /**
   * Get monthly revenue
   */
  async getMonthlyRevenue(year: number, month: number) {
    const startDate = new Date(year, month - 1, 1).toISOString();
    const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();

    const result = await this.db
      .select({
        total_revenue: sql<string>`CAST(SUM(${orders.total_amount}) AS DECIMAL(10,2))`,
        total_orders: sql<number>`CAST(COUNT(${orders.id}) AS INTEGER)`,
        avg_order_value: sql<string>`CAST(AVG(${orders.total_amount}) AS DECIMAL(10,2))`,
      })
      .from(orders)
      .where(
        and(
          eq(orders.status, 'completed'),
          gte(orders.created_at, startDate),
          lte(orders.created_at, endDate),
        ),
      );

    return {
      year,
      month,
      data: result[0] || {
        total_revenue: '0.00',
        total_orders: 0,
        avg_order_value: '0.00',
      },
    };
  }

  /**
   * Get popular menu items by order count
   */
  async getPopularItems(
    startDate?: string,
    endDate?: string,
    limit: number = 10,
  ) {
    const whereConditions = [
      eq(orders.status, 'completed'),
    ];

    if (startDate) {
      whereConditions.push(gte(orders.created_at, startDate));
    }
    if (endDate) {
      whereConditions.push(lte(orders.created_at, endDate));
    }

    const result = await this.db
      .select({
        menu_item_id: orderItems.menu_item_id,
        menu_item_name: menuItems.name,
        category_name: sql<string>`(SELECT name FROM menu_categories WHERE id = ${menuItems.category_id})`,
        times_ordered: sql<number>`CAST(COUNT(${orderItems.id}) AS INTEGER)`,
        total_quantity: sql<number>`CAST(SUM(${orderItems.quantity}) AS INTEGER)`,
        total_revenue: sql<string>`CAST(SUM(${orderItems.total_price}) AS DECIMAL(10,2))`,
        avg_price: sql<string>`CAST(AVG(${orderItems.unit_price}) AS DECIMAL(10,2))`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.order_id, orders.id))
      .innerJoin(menuItems, eq(orderItems.menu_item_id, menuItems.id))
      .where(and(...whereConditions))
      .groupBy(orderItems.menu_item_id, menuItems.name, menuItems.category_id)
      .orderBy(desc(sql`SUM(${orderItems.quantity})`))
      .limit(limit);

    return {
      data: result,
      total_items: result.length,
    };
  }

  /**
   * Get overall analytics summary
   */
  async getAnalyticsSummary(startDate?: string, endDate?: string) {
    const whereConditions = [];

    if (startDate) {
      whereConditions.push(gte(orders.created_at, startDate));
    }
    if (endDate) {
      whereConditions.push(lte(orders.created_at, endDate));
    }

    // Overall stats
    const overallStats = await this.db
      .select({
        total_orders: sql<number>`CAST(COUNT(${orders.id}) AS INTEGER)`,
        completed_orders: sql<number>`CAST(COUNT(CASE WHEN ${orders.status} = 'completed' THEN 1 END) AS INTEGER)`,
        total_revenue: sql<string>`CAST(SUM(CASE WHEN ${orders.status} = 'completed' THEN ${orders.total_amount} ELSE 0 END) AS DECIMAL(10,2))`,
        avg_order_value: sql<string>`CAST(AVG(CASE WHEN ${orders.status} = 'completed' THEN ${orders.total_amount} END) AS DECIMAL(10,2))`,
      })
      .from(orders)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    // Top items by revenue
    const topItemsByRevenue = await this.getRevenueByMenuItems(
      startDate,
      endDate,
      5,
    );

    // Top items by popularity
    const topItemsByPopularity = await this.getPopularItems(
      startDate,
      endDate,
      5,
    );

    return {
      summary: overallStats[0] || {
        total_orders: 0,
        completed_orders: 0,
        total_revenue: '0.00',
        avg_order_value: '0.00',
      },
      top_revenue_items: topItemsByRevenue.data,
      top_popular_items: topItemsByPopularity.data,
    };
  }
}
