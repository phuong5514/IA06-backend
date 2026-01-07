import { Injectable } from '@nestjs/common';
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, and, inArray, sql, desc } from 'drizzle-orm';
import {
  usersTable,
  userPreferences,
  savedPaymentMethods,
  orders,
  orderItems,
  menuItems,
  payments,
  paymentOrders,
} from './db/schema';
import { AuthService, TokenPair } from './auth/auth.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }
}

@Injectable()
export class UserService {
  private db;

  constructor(private authService: AuthService) {
    this.db = drizzle(process.env.DATABASE_URL);
  }

  async registerUser(
    email: string,
    password: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Check if email already exists
      const existingUsers = await this.db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, email));

      if (existingUsers.length > 0) {
        return { success: false, message: `user ${email} already exists` };
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 12);

      const newUser: typeof usersTable.$inferInsert = {
        email: email,
        password: hashedPassword,
      };

      await this.db.insert(usersTable).values(newUser);
      return {
        success: true,
        message: `user ${email} registered successfully`,
      };
    } catch (error) {
      return {
        success: false,
        message: `user ${email} failed to registered, reason: ${error}`,
      };
    }
  }

  async login(
    email: string,
    password: string,
    deviceInfo?: string,
    ip?: string,
  ): Promise<{
    success: boolean;
    message: string;
    accessToken?: string;
    refreshToken?: string;
    email?: string;
  }> {
    try {
      const users = await this.db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, email));

      if (users.length === 0) {
        return { success: false, message: 'User not found' };
      }

      const user = users[0];

      // Compare hashed passwords using bcrypt
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (isPasswordValid) {
        // Generate JWT tokens
        const tokens = await this.authService.generateTokenPair(
          user.id,
          user.email,
          user.role,
          deviceInfo,
          ip,
        );

        return {
          success: true,
          message: 'Login successful',
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          email: user.email,
        };
      } else {
        return { success: false, message: 'Invalid password' };
      }
    } catch (error) {
      return { success: false, message: `Login failed: ${error}` };
    }
  }

  async refreshToken(refreshToken: string): Promise<{
    success: boolean;
    message: string;
    accessToken?: string;
    refreshToken?: string;
  }> {
    try {
      const tokens = await this.authService.refreshAccessToken(refreshToken);

      if (!tokens) {
        return { success: false, message: 'Invalid or expired refresh token' };
      }

      return {
        success: true,
        message: 'Token refreshed successfully',
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    } catch (error) {
      return { success: false, message: `Token refresh failed: ${error}` };
    }
  }

  async logout(
    refreshToken: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      const payload = await this.authService.validateRefreshToken(refreshToken);

      if (!payload || !payload.jti) {
        return { success: false, message: 'Invalid refresh token' };
      }

      const revoked = await this.authService.revokeRefreshToken(payload.jti);

      if (revoked) {
        return { success: true, message: 'Logged out successfully' };
      } else {
        return { success: false, message: 'Failed to revoke token' };
      }
    } catch (error) {
      return { success: false, message: `Logout failed: ${error}` };
    }
  }

  // Get user's order history (both paid and unpaid)
  async getUserOrders(userId: string) {
    try {
      // Get all orders for the user
      const userOrders = await this.db
        .select({
          order: orders,
          orderItem: orderItems,
          menuItem: menuItems,
        })
        .from(orders)
        .leftJoin(orderItems, eq(orders.id, orderItems.order_id))
        .leftJoin(menuItems, eq(orderItems.menu_item_id, menuItems.id))
        .where(eq(orders.user_id, userId))
        .orderBy(desc(orders.created_at))
        .execute();

      // Get payment information for all orders
      const orderIds = [...new Set(userOrders.map((o) => o.order.id))];
      
      let paidOrdersMap = new Map();
      if (orderIds.length > 0) {
        const paidOrders = await this.db
          .select({
            orderId: paymentOrders.order_id,
            payment: payments,
          })
          .from(paymentOrders)
          .innerJoin(payments, eq(paymentOrders.payment_id, payments.id))
          .where(
            and(
              inArray(paymentOrders.order_id, orderIds as number[]),
              eq(payments.payment_status, 'completed')
            )
          )
          .execute();

        paidOrders.forEach((po) => {
          paidOrdersMap.set(po.orderId, po.payment);
        });
      }

      // Group by order
      const groupedOrders = userOrders.reduce((acc, item) => {
        const orderId = item.order.id;
        if (!acc[orderId]) {
          acc[orderId] = {
            ...item.order,
            items: [],
            payment: paidOrdersMap.get(orderId) || null,
            isPaid: paidOrdersMap.has(orderId),
          };
        }
        if (item.orderItem && item.menuItem) {
          acc[orderId].items.push({
            ...item.orderItem,
            menuItem: item.menuItem,
          });
        }
        return acc;
      }, {} as any);

      const ordersArray = Object.values(groupedOrders);

      // Separate into paid and unpaid
      const paidOrders = ordersArray.filter((o: any) => o.isPaid);
      const unpaidOrders = ordersArray.filter((o: any) => !o.isPaid);

      return {
        success: true,
        orders: ordersArray,
        paidOrders,
        unpaidOrders,
        totalOrders: ordersArray.length,
      };
    } catch (error) {
      console.error('Error fetching user orders:', error);
      throw new Error('Failed to fetch user orders');
    }
  }

  // Get user's food preferences
  async getUserPreferences(userId: string) {
    try {
      const prefs = await this.db
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.user_id, userId))
        .execute();

      if (prefs.length === 0) {
        return {
          success: true,
          preferences: {
            dietary_tags: [],
          },
        };
      }

      return {
        success: true,
        preferences: {
          dietary_tags: prefs[0].dietary_tags || [],
        },
      };
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      throw new Error('Failed to fetch user preferences');
    }
  }

  // Update user's food preferences
  async updateUserPreferences(userId: string, dietary_tags: string[]) {
    try {
      // Check if preferences exist
      const existing = await this.db
        .select()
        .from(userPreferences)
        .where(eq(userPreferences.user_id, userId))
        .execute();

      if (existing.length === 0) {
        // Insert new preferences
        await this.db
          .insert(userPreferences)
          .values({
            user_id: userId,
            dietary_tags,
          })
          .execute();
      } else {
        // Update existing preferences
        await this.db
          .update(userPreferences)
          .set({
            dietary_tags,
            updated_at: sql`now()`,
          })
          .where(eq(userPreferences.user_id, userId))
          .execute();
      }

      return {
        success: true,
        message: 'Preferences updated successfully',
        preferences: { dietary_tags },
      };
    } catch (error) {
      console.error('Error updating user preferences:', error);
      throw new Error('Failed to update user preferences');
    }
  }

  // Get available dietary tags from menu items
  async getAvailableDietaryTags() {
    try {
      const items = await this.db
        .select({ dietary_tags: menuItems.dietary_tags })
        .from(menuItems)
        .execute();

      const tagsSet = new Set<string>();
      items.forEach((item) => {
        if (item.dietary_tags && Array.isArray(item.dietary_tags)) {
          item.dietary_tags.forEach((tag) => {
            if (tag) tagsSet.add(tag);
          });
        }
      });

      return {
        success: true,
        tags: Array.from(tagsSet).sort(),
      };
    } catch (error) {
      console.error('Error fetching available tags:', error);
      throw new Error('Failed to fetch available dietary tags');
    }
  }

  // Get user's saved payment methods
  async getSavedPaymentMethods(userId: string) {
    try {
      const methods = await this.db
        .select()
        .from(savedPaymentMethods)
        .where(eq(savedPaymentMethods.user_id, userId))
        .orderBy(desc(savedPaymentMethods.is_default))
        .execute();

      return {
        success: true,
        paymentMethods: methods,
      };
    } catch (error) {
      console.error('Error fetching saved payment methods:', error);
      throw new Error('Failed to fetch saved payment methods');
    }
  }

  // Save a new payment method
  async savePaymentMethod(
    userId: string,
    methodData: {
      stripe_payment_method_id: string;
      card_brand: string;
      last4: string;
      exp_month: number;
      exp_year: number;
      is_default?: boolean;
    }
  ) {
    try {
      // If this is set as default, unset all other defaults
      if (methodData.is_default) {
        await this.db
          .update(savedPaymentMethods)
          .set({ is_default: false })
          .where(eq(savedPaymentMethods.user_id, userId))
          .execute();
      }

      const [newMethod] = await this.db
        .insert(savedPaymentMethods)
        .values({
          user_id: userId,
          ...methodData,
        })
        .returning()
        .execute();

      return {
        success: true,
        message: 'Payment method saved successfully',
        paymentMethod: newMethod,
      };
    } catch (error) {
      console.error('Error saving payment method:', error);
      throw new Error('Failed to save payment method');
    }
  }

  // Delete a saved payment method
  async deletePaymentMethod(userId: string, paymentMethodId: number) {
    try {
      await this.db
        .delete(savedPaymentMethods)
        .where(
          and(
            eq(savedPaymentMethods.id, paymentMethodId),
            eq(savedPaymentMethods.user_id, userId)
          )
        )
        .execute();

      return {
        success: true,
        message: 'Payment method deleted successfully',
      };
    } catch (error) {
      console.error('Error deleting payment method:', error);
      throw new Error('Failed to delete payment method');
    }
  }

  // Set default payment method
  async setDefaultPaymentMethod(userId: string, paymentMethodId: number) {
    try {
      // Unset all other defaults
      await this.db
        .update(savedPaymentMethods)
        .set({ is_default: false })
        .where(eq(savedPaymentMethods.user_id, userId))
        .execute();

      // Set the selected one as default
      await this.db
        .update(savedPaymentMethods)
        .set({ is_default: true })
        .where(
          and(
            eq(savedPaymentMethods.id, paymentMethodId),
            eq(savedPaymentMethods.user_id, userId)
          )
        )
        .execute();

      return {
        success: true,
        message: 'Default payment method set successfully',
      };
    } catch (error) {
      console.error('Error setting default payment method:', error);
      throw new Error('Failed to set default payment method');
    }
  }
}
