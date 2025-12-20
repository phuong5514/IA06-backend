import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { tables } from '../db/schema';
import { QrService } from './qr.service';

@Injectable()
export class TablesService {
  constructor(private readonly qrService: QrService) {}

  /**
   * Verify a QR token and return table information with menu URL
   * @param qrToken - The QR token to verify
   * @returns Table information and menu URL
   */
  async verifyQrToken(qrToken: string): Promise<{
    table_id: number;
    table_number: string;
    menu_url: string;
  }> {
    // Verify the token signature and expiration
    const verification = this.qrService.verifyTableToken(qrToken);

    if (!verification.valid) {
      if (verification.expired) {
        throw new BadRequestException(
          'QR code has expired. Please request a new one.',
        );
      }
      throw new BadRequestException('Invalid QR code.');
    }

    const tableId = verification.tableId;
    if (!tableId) {
      throw new BadRequestException('Invalid QR code format.');
    }

    // Fetch table from database
    const [table] = await db
      .select()
      .from(tables)
      .where(eq(tables.id, parseInt(tableId)))
      .limit(1);

    if (!table) {
      throw new NotFoundException('Table not found.');
    }

    if (!table.is_active) {
      throw new BadRequestException('This table is currently unavailable.');
    }

    // Generate menu URL (can be configured via environment variable)
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const menu_url = `${baseUrl}/menu?table=${table.id}`;

    return {
      table_id: table.id,
      table_number: table.table_number,
      menu_url,
    };
  }

  /**
   * Generate a new QR token for a table
   * @param tableId - The table ID
   * @returns The generated QR token and expiration date
   */
  async generateQrForTable(tableId: number): Promise<{
    qr_token: string;
    expires_at: Date;
  }> {
    // Check if table exists
    const [table] = await db
      .select()
      .from(tables)
      .where(eq(tables.id, tableId))
      .limit(1);

    if (!table) {
      throw new NotFoundException('Table not found.');
    }

    // Generate token (1 year TTL)
    const ttlSeconds = 60 * 60 * 24 * 365;
    const qr_token = this.qrService.generateTableToken(tableId, ttlSeconds);
    const expires_at = new Date(Date.now() + ttlSeconds * 1000);

    // Update table record
    await db
      .update(tables)
      .set({
        qr_token,
        qr_generated_at: new Date().toISOString(),
        qr_expires_at: expires_at.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .where(eq(tables.id, tableId));

    return {
      qr_token,
      expires_at,
    };
  }
}
