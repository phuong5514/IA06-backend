import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, and } from 'drizzle-orm';
import { refreshTokensTable } from '../db/schema';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import 'dotenv/config';

export interface JwtPayload {
  sub: string; // user id (UUID)
  email: string;
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
    this.db = drizzle(process.env.DATABASE_URL);
  }

  async generateTokenPair(userId: string, email: string, deviceInfo?: string, ip?: string): Promise<TokenPair> {
    const jti = randomUUID();

    // Generate access token (short-lived: 15 minutes)
    const accessTokenPayload: JwtPayload = {
      sub: userId,
      email: email,
    };

    const accessToken = this.jwtService.sign(accessTokenPayload, {
      expiresIn: '15m',
      secret: process.env.JWT_ACCESS_SECRET,
    });

    // Generate refresh token (long-lived: 7 days)
    const refreshTokenPayload: JwtPayload = {
      sub: userId,
      email: email,
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
            eq(refreshTokensTable.jti, payload.jti)
          )
        );

      if (tokens.length === 0) {
        return null;
      }

      const dbToken = tokens[0];

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

    // Generate new token pair
    return this.generateTokenPair(payload.sub, payload.email);
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
}
