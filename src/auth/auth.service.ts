import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { eq, and } from 'drizzle-orm';
import { refreshTokensTable, usersTable } from '../db/schema';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { getDrizzleDb } from '../infrastructure/drizzle.provider';
import 'dotenv/config';

export interface JwtPayload {
  sub: string; // user id (UUID)
  email: string;
  role: string;
  jti?: string; // JWT ID for refresh token
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private db;

  constructor(private jwtService: JwtService) {
    this.db = getDrizzleDb();
  }

  async generateTokenPair(
    userId: string,
    email: string,
    role: string,
    deviceInfo?: string,
    ip?: string,
  ): Promise<TokenPair> {
    const jti = randomUUID();

    // Generate access token (short-lived: 15 minutes)
    const accessTokenPayload: JwtPayload = {
      sub: userId,
      email: email,
      role: role,
    };

    const accessToken = this.jwtService.sign(accessTokenPayload, {
      expiresIn: '15m',
      secret: process.env.JWT_ACCESS_SECRET,
    });

    // Generate refresh token (long-lived: 7 days)
    const refreshTokenPayload: JwtPayload = {
      sub: userId,
      email: email,
      role: role,
      jti: jti,
    };

    const refreshToken = this.jwtService.sign(refreshTokenPayload, {
      expiresIn: '7d',
      secret: process.env.JWT_REFRESH_SECRET,
    });

    // Hash refresh token before storing
    const tokenHash = await bcrypt.hash(refreshToken, 12);

    // Calculate expiration date (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Store refresh token in database
    await this.db.insert(refreshTokensTable).values({
      userId: userId,
      tokenHash: tokenHash,
      jti: jti,
      expiresAt: expiresAt,
      deviceInfo: deviceInfo,
      issuedByIp: ip,
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  async validateAccessToken(token: string): Promise<JwtPayload | null> {
    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_ACCESS_SECRET,
      });
      return payload;
    } catch (error) {
      return null;
    }
  }

  async validateRefreshToken(refreshToken: string): Promise<JwtPayload | null> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      // Check if token exists in database and is not revoked
      const tokens = await this.db
        .select()
        .from(refreshTokensTable)
        .where(
          and(
            eq(refreshTokensTable.userId, payload.sub),
            eq(refreshTokensTable.jti, payload.jti),
          ),
        );

      if (tokens.length === 0) {
        return null;
      }

      const dbToken = tokens[0];

      // Verify the token hash
      const isValidHash = await bcrypt.compare(refreshToken, dbToken.tokenHash);
      if (!isValidHash) {
        return null;
      }

      // Check if token is revoked or expired
      if (dbToken.revoked || new Date(dbToken.expiresAt) < new Date()) {
        return null;
      }

      // Update last used timestamp
      await this.db
        .update(refreshTokensTable)
        .set({ lastUsedAt: new Date() })
        .where(eq(refreshTokensTable.id, dbToken.id));

      return payload;
    } catch (error) {
      return null;
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<TokenPair | null> {
    const payload = await this.validateRefreshToken(refreshToken);

    if (!payload) {
      return null;
    }

    // Revoke the old refresh token (token rotation)
    try {
      if (payload.jti) {
        await this.revokeRefreshToken(payload.jti);
      }
    } catch (err) {
      // ignore revocation errors
    }

    // Fetch user role from database
    const users = await this.db
      .select({ role: usersTable.role })
      .from(usersTable)
      .where(eq(usersTable.id, payload.sub))
      .limit(1);

    if (users.length === 0) {
      return null;
    }

    // Generate new token pair
    return this.generateTokenPair(payload.sub, payload.email, users[0].role);
  }

  async revokeRefreshToken(jti: string): Promise<boolean> {
    try {
      await this.db
        .update(refreshTokensTable)
        .set({ revoked: true })
        .where(eq(refreshTokensTable.jti, jti));
      return true;
    } catch (error) {
      return false;
    }
  }

  async revokeAllUserTokens(userId: string): Promise<boolean> {
    try {
      await this.db
        .update(refreshTokensTable)
        .set({ revoked: true })
        .where(eq(refreshTokensTable.userId, userId));
      return true;
    } catch (error) {
      return false;
    }
  }

  async handleGoogleLogin(googleUser: {
    email: string;
    name: string;
    profile_image_url: string | null;
    oauth_provider: string;
    oauth_id: string;
  }): Promise<{ user: any; tokens: TokenPair }> {
    // Check if user already exists with Google OAuth
    let users = await this.db
      .select()
      .from(usersTable)
      .where(
        and(
          eq(usersTable.oauth_provider, googleUser.oauth_provider),
          eq(usersTable.oauth_id, googleUser.oauth_id),
        ),
      )
      .limit(1);

    let user: any;

    if (users.length === 0) {
      // Check if user exists with same email but different provider
      const emailUsers = await this.db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, googleUser.email))
        .limit(1);

      if (emailUsers.length > 0) {
        // Link Google account to existing user
        user = emailUsers[0];
        await this.db
          .update(usersTable)
          .set({
            oauth_provider: googleUser.oauth_provider,
            oauth_id: googleUser.oauth_id,
            email_verified: true,
            profile_image_url:
              googleUser.profile_image_url || user.profile_image_url,
            name: user.name || googleUser.name,
          })
          .where(eq(usersTable.id, user.id));
      } else {
        // Create new user
        const newUsers = await this.db
          .insert(usersTable)
          .values({
            email: googleUser.email,
            name: googleUser.name,
            profile_image_url: googleUser.profile_image_url,
            oauth_provider: googleUser.oauth_provider,
            oauth_id: googleUser.oauth_id,
            role: 'customer',
            email_verified: true,
            password: null, // No password for OAuth users
          })
          .returning();

        user = newUsers[0];
      }

      // Fetch the user again to get updated data
      users = await this.db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, user.id))
        .limit(1);
      user = users[0];
    } else {
      user = users[0];

      // Update last login
      await this.db
        .update(usersTable)
        .set({ last_login: new Date().toISOString() })
        .where(eq(usersTable.id, user.id));
    }

    // Generate tokens
    const tokens = await this.generateTokenPair(
      user.id,
      user.email,
      user.role,
    );

    return { user, tokens };
  }
}
