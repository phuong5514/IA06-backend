import { Injectable } from '@nestjs/common';
import { signTableToken, verifyTableToken } from '../utils/qr';

@Injectable()
export class QrService {
  /**
   * Generate a signed QR token for a table
   * @param tableId - The table ID
   * @param ttlSeconds - Time to live in seconds (default: 1 year)
   * @returns Signed QR token
   */
  generateTableToken(tableId: string | number, ttlSeconds = 60 * 60 * 24 * 365): string {
    return signTableToken(tableId, ttlSeconds);
  }

  /**
   * Verify a QR token and extract table ID
   * @param token - The QR token to verify
   * @returns Verification result with table ID if valid
   */
  verifyTableToken(token: string): { valid: boolean; tableId?: string; expired?: boolean } {
    return verifyTableToken(token);
  }
}
