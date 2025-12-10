import { Injectable } from '@nestjs/common';
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { usersTable } from './db/schema';
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

  async registerUser(email: string, password: string): Promise<{ success: boolean; message: string }> {
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
      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser: typeof usersTable.$inferInsert = {
        email: email,
        password: hashedPassword,
      }

      await this.db.insert(usersTable).values(newUser);
      return { success: true, message: `user ${email} registered successfully` };
    } catch(error) {
      return { success: false, message: `user ${email} failed to registered, reason: ${error}` };
    }

  }

  async login(email: string, password: string, deviceInfo?: string, ip?: string): Promise<{ success: boolean; message: string; accessToken?: string; refreshToken?: string; email?: string }> {
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
        const tokens = await this.authService.generateTokenPair(user.id, user.email, deviceInfo, ip);
        
        return { 
          success: true, 
          message: 'Login successful',
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          email: user.email
        };
      } else {
        return { success: false, message: 'Invalid password' };
      }
    } catch (error) {
      return { success: false, message: `Login failed: ${error}` };
    }
  }

  async refreshToken(refreshToken: string): Promise<{ success: boolean; message: string; accessToken?: string; refreshToken?: string }> {
    try {
      const tokens = await this.authService.refreshAccessToken(refreshToken);
      
      if (!tokens) {
        return { success: false, message: 'Invalid or expired refresh token' };
      }

      return {
        success: true,
        message: 'Token refreshed successfully',
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      };
    } catch (error) {
      return { success: false, message: `Token refresh failed: ${error}` };
    }
  }

  async logout(refreshToken: string): Promise<{ success: boolean; message: string }> {
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

}