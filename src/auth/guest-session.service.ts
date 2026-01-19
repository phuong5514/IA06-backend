import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { eq, and, or, inArray, isNotNull, sql } from 'drizzle-orm';
import { users, orders, tables } from '../db/schema';
import { randomBytes } from 'crypto';
import { getDrizzleDb } from '../infrastructure/drizzle.provider';

@Injectable()
export class GuestSessionService {
  private db;

  constructor(private jwtService: JwtService) {
    this.db = getDrizzleDb();
  }

  /**
   * Create a temporary guest account for a table session
   * @param tableId - The table ID
   * @param sessionId - Unique session identifier
   * @returns Guest user info and access token
   */
  async createGuestSession(tableId: number, sessionId: string) {
    // Generate unique guest email
    const guestEmail = `guest_${sessionId}@temporary.local`;
    
    // Check if guest already exists for this session
    const [existingGuest] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, guestEmail))
      .limit(1);

    let guestUser;
    
    if (existingGuest) {
      guestUser = existingGuest;
    } else {
      // Create new guest user
      const [newGuest] = await this.db
        .insert(users)
        .values({
          email: guestEmail,
          password: null, // No password for guest accounts
          role: 'customer',
          name: `Guest - Table ${tableId}`,
          is_guest: true,
          is_active: true,
          email_verified: true, // Guests are auto-verified
        })
        .returning();
      
      guestUser = newGuest;
    }

    // Generate access token for guest
    const accessToken = this.jwtService.sign(
      {
        userId: guestUser.id,
        email: guestUser.email,
        role: guestUser.role,
        isGuest: true,
        sessionId: sessionId,
        tableId: tableId,
      },
      {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: '24h', // Longer expiry for guests
      }
    );

    return {
      guestUser: {
        id: guestUser.id,
        email: guestUser.email,
        name: guestUser.name,
        role: guestUser.role,
        isGuest: true,
      },
      accessToken,
      sessionId,
    };
  }

  /**
   * Transfer all orders from a guest session to an authenticated account
   * @param guestUserId - The guest user ID
   * @param sessionId - The session ID to transfer
   * @param targetUserId - The authenticated user ID to transfer to
   * @returns Number of orders transferred
   */
  async transferGuestOrders(
    guestUserId: string,
    sessionId: string,
    targetUserId: string,
  ): Promise<{ ordersTransferred: number }> {
    // Update all orders from the guest session to the target user
    const result = await this.db
      .update(orders)
      .set({
        user_id: targetUserId,
        updated_at: new Date().toISOString(),
      })
      .where(
        and(
          eq(orders.user_id, guestUserId),
          eq(orders.session_id, sessionId),
        ),
      )
      .returning({ id: orders.id });

    // Optionally: Mark guest user as inactive
    await this.db
      .update(users)
      .set({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .where(eq(users.id, guestUserId));

    return { ordersTransferred: result.length };
  }

  /**
   * End a session and cancel all incomplete orders
   * @param sessionId - The session ID to end
   * @param tableId - Optional table ID for additional validation
   * @returns Number of orders cancelled
   */
  async endSession(
    sessionId: string,
    tableId?: number,
  ): Promise<{ ordersCancelled: number }> {
    // Find all incomplete orders for this session
    // Incomplete orders are: pending, accepted, preparing, ready, served
    const incompleteStatuses = ['pending', 'accepted', 'preparing', 'ready', 'served'] as const;
    
    const conditions = [
      eq(orders.session_id, sessionId),
      inArray(orders.status, incompleteStatuses),
    ];

    // Update all incomplete orders to cancelled
    const result = await this.db
      .update(orders)
      .set({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .where(and(...conditions))
      .returning({ id: orders.id });

    return { ordersCancelled: result.length };
  }

  /**
   * Get all active sessions with their details
   * @returns Array of active sessions with user, table, and order information
   */
  async getActiveSessions() {
    // Find all orders with session_id that are not completed or cancelled
    const incompleteStatuses = ['pending', 'accepted', 'preparing', 'ready', 'served'] as const;
    
    const activeOrders = await this.db
      .select({
        sessionId: orders.session_id,
        tableId: orders.table_id,
        userId: orders.user_id,
        status: orders.status,
        totalAmount: orders.total_amount,
        createdAt: orders.created_at,
      })
      .from(orders)
      .where(
        and(
          isNotNull(orders.session_id),
          inArray(orders.status, incompleteStatuses),
        ),
      )
      .execute();

    // Group orders by session
    const sessionsMap = new Map();
    
    for (const order of activeOrders) {
      if (!order.sessionId) continue;
      
      if (!sessionsMap.has(order.sessionId)) {
        // Fetch user details only if userId exists
        let user = null;
        if (order.userId) {
          [user] = await this.db
            .select()
            .from(users)
            .where(eq(users.id, order.userId))
            .limit(1);
        }

        // Fetch table details if table_id exists
        let tableNumber = 'N/A';
        if (order.tableId) {
          const [table] = await this.db
            .select()
            .from(tables)
            .where(eq(tables.id, order.tableId))
            .limit(1);
          
          if (table) {
            tableNumber = table.table_number;
          }
        }

        sessionsMap.set(order.sessionId, {
          sessionId: order.sessionId,
          tableId: order.tableId,
          tableNumber,
          userId: order.userId,
          userName: order.userId ? (user?.name || user?.email || 'Unknown') : 'Guest',
          isGuest: order.userId ? (user?.is_guest || false) : true,
          startedAt: order.createdAt,
          incompleteOrderCount: 0,
          totalOrderValue: '0',
        });
      }

      // Update session stats
      const session = sessionsMap.get(order.sessionId);
      session.incompleteOrderCount += 1;
      session.totalOrderValue = (
        parseFloat(session.totalOrderValue) + parseFloat(order.totalAmount)
      ).toFixed(2);
      
      // Update startedAt to earliest order
      if (new Date(order.createdAt) < new Date(session.startedAt)) {
        session.startedAt = order.createdAt;
      }
    }

    return Array.from(sessionsMap.values());
  }

  /**
   * Delete a guest user account
   * @param userId - The user ID to delete
   * @returns Success status
   */
  async deleteGuestUser(userId: string): Promise<{ success: boolean }> {
    try {
      // Verify this is actually a guest user before deleting
      const [user] = await this.db
        .select()
        .from(users)
        .where(and(eq(users.id, userId), eq(users.is_guest, true)))
        .limit(1);

      if (!user) {
        // Not a guest user or doesn't exist
        return { success: false };
      }

      // Delete the guest user
      await this.db.delete(users).where(eq(users.id, userId));

      return { success: true };
    } catch (error) {
      console.error('Error deleting guest user:', error);
      return { success: false };
    }
  }

  /**
   * Generate a unique session ID
   */
  generateSessionId(): string {
    return randomBytes(16).toString('hex');
  }
}
