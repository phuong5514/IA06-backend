import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, and } from 'drizzle-orm';
import { users, orders } from '../db/schema';
import { randomBytes } from 'crypto';

@Injectable()
export class GuestSessionService {
  private db;

  constructor(private jwtService: JwtService) {
    this.db = drizzle(process.env.DATABASE_URL);
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
   * Generate a unique session ID
   */
  generateSessionId(): string {
    return randomBytes(16).toString('hex');
  }
}
