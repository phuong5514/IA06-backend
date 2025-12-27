import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, or, like, desc, asc, sql } from 'drizzle-orm';
import * as QRCode from 'qrcode';
import PDFKit from 'pdfkit';
import archiver from 'archiver';
import * as fs from 'fs';
import * as path from 'path';
import { PDFDocument } from 'pdf-lib';
import { db } from '../db';
import { tables } from '../db/schema';
import { QrService } from './qr.service';

@Injectable()
export class TablesService {
  constructor(private readonly qrService: QrService) {}

  /**
   * Create a new table
   */
  async createTable(data: {
    table_number: string;
    capacity: number;
    location?: string;
    description?: string;
  }) {
    // Validate capacity
    if (data.capacity < 1 || data.capacity > 20) {
      throw new BadRequestException('Capacity must be between 1 and 20');
    }

    // Check if table number already exists
    const existing = await db
      .select()
      .from(tables)
      .where(eq(tables.table_number, data.table_number))
      .limit(1);

    if (existing.length > 0) {
      throw new BadRequestException('Table number already exists');
    }

    const [newTable] = await db
      .insert(tables)
      .values({
        table_number: data.table_number,
        capacity: data.capacity,
        location: data.location,
        description: data.description,
        is_active: true,
      })
      .returning();

    return newTable;
  }

  /**
   * Get all tables with optional filters
   */
  async getTables(filters?: {
    status?: 'active' | 'inactive';
    location?: string;
    search?: string;
    sortBy?: 'table_number' | 'capacity' | 'created_at';
    sortOrder?: 'asc' | 'desc';
  }) {
    const conditions = [];

    // Apply filters
    if (filters?.status) {
      conditions.push(eq(tables.is_active, filters.status === 'active'));
    }

    if (filters?.location) {
      conditions.push(eq(tables.location, filters.location));
    }

    if (filters?.search) {
      conditions.push(
        or(
          like(tables.table_number, `%${filters.search}%`),
          like(tables.location, `%${filters.search}%`),
          like(tables.description, `%${filters.search}%`),
        ),
      );
    }

    // Apply sorting
    const sortBy = filters?.sortBy || 'table_number';
    const sortOrder = filters?.sortOrder || 'asc';

    let orderByColumn;
    switch (sortBy) {
      case 'capacity':
        orderByColumn = tables.capacity;
        break;
      case 'created_at':
        orderByColumn = tables.created_at;
        break;
      default:
        orderByColumn = tables.table_number;
    }

    const query = db
      .select()
      .from(tables)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(sortOrder === 'desc' ? desc(orderByColumn) : asc(orderByColumn));

    return query;
  }

  /**
   * Get a single table by ID
   */
  async getTableById(id: number) {
    const [table] = await db
      .select()
      .from(tables)
      .where(eq(tables.id, id))
      .limit(1);

    if (!table) {
      throw new NotFoundException('Table not found');
    }

    return table;
  }

  /**
   * Update a table
   */
  async updateTable(
    id: number,
    data: {
      table_number?: string;
      capacity?: number;
      location?: string;
      description?: string;
    },
  ) {
    // Check if table exists
    const existing = await this.getTableById(id);

    // Validate capacity if provided
    if (
      data.capacity !== undefined &&
      (data.capacity < 1 || data.capacity > 20)
    ) {
      throw new BadRequestException('Capacity must be between 1 and 20');
    }

    // Check table number uniqueness if changing
    if (data.table_number && data.table_number !== existing.table_number) {
      const duplicate = await db
        .select()
        .from(tables)
        .where(eq(tables.table_number, data.table_number))
        .limit(1);

      if (duplicate.length > 0) {
        throw new BadRequestException('Table number already exists');
      }
    }

    const [updatedTable] = await db
      .update(tables)
      .set({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .where(eq(tables.id, id))
      .returning();

    return updatedTable;
  }

  /**
   * Update table status (activate/deactivate)
   */
  async updateTableStatus(id: number, isActive: boolean) {
    const [updatedTable] = await db
      .update(tables)
      .set({
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .where(eq(tables.id, id))
      .returning();

    if (!updatedTable) {
      throw new NotFoundException('Table not found');
    }

    return updatedTable;
  }

  /**
   * Delete a table (soft delete by deactivating)
   */
  async deleteTable(id: number) {
    return this.updateTableStatus(id, false);
  }

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

  /**
   * Generate QR code image as data URL
   */
  async generateQrCodeImage(qrToken: string): Promise<string> {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const menuUrl = `${baseUrl}/menu?qr=${qrToken}`;

    return QRCode.toDataURL(menuUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
  }

  /**
   * Generate QR code PDF
   */
  async generateQrCodePdf(table: any): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFKit({
          size: 'A4',
          margin: 50,
        });

        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        // Load images
        const assetsPath = path.join(process.cwd(), 'src', 'assets');
        const backgroundPath = path.join(assetsPath, 'background.png');
        const logoPath = path.join(assetsPath, 'logo.png');

        const backgroundBuffer = fs.readFileSync(backgroundPath);
        const logoBuffer = fs.readFileSync(logoPath);

        // Add background image
        doc.image(backgroundBuffer, 0, 0, {
          width: doc.page.width,
          height: doc.page.height,
        });

        // Add frosted effect inside the border area
        doc
          .fillOpacity(0.3)
          .rect(20, 20, doc.page.width - 40, doc.page.height - 40)
          .fill('gray');
        doc.fillOpacity(1); // Reset opacity

        // Add border
        doc
          .strokeColor('white')
          .lineWidth(2)
          .rect(20, 20, doc.page.width - 40, doc.page.height - 40)
          .stroke();

        // Add logo at the top center
        const logoWidth = 100;
        const logoHeight = 100;
        const logoX = (doc.page.width - logoWidth) / 2;
        doc.image(logoBuffer, logoX, 30, {
          width: logoWidth,
          height: logoHeight,
        });

        // Title
        doc.moveDown(3);
        doc
          .fillColor('white')
          .font('Times-Italic')
          .fontSize(24)
          .text('Smart Restaurant', { align: 'center' });
        doc
          .fontSize(18)
          .text(`Table ${table.table_number}`, { align: 'center' });
        doc.moveDown();

        // Table info
        doc.fontSize(12);
        doc.text(`Capacity: ${table.capacity} seats`);
        if (table.location) {
          doc.text(`Location: ${table.location}`);
        }
        doc.moveDown();

        // Instructions
        doc.fontSize(14).text('Scan QR Code to Order', { align: 'center' });
        doc.moveDown(2);

        // Generate QR code
        const qrToken = table.qr_token;
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const menuUrl = `${baseUrl}/menu?qr=${qrToken}`;

        const qrDataUrl = await QRCode.toDataURL(menuUrl, {
          width: 200,
          margin: 2,
        });

        // Convert data URL to buffer
        const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '');
        const qrBuffer = Buffer.from(base64Data, 'base64');

        // Position QR code in center
        const qrSize = 200;
        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;
        const x = (pageWidth - qrSize) / 2;
        const y = (pageHeight - qrSize) / 2 - 50;

        // Add QR code image
        doc.image(qrBuffer, x, y, { width: qrSize, height: qrSize });

        // Footer
        doc.moveDown(20);
        doc
          .fontSize(8)
          .text('Generated on ' + new Date().toLocaleDateString(), {
            align: 'center',
          });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate ZIP file with all QR codes
   */
  async generateAllQrCodesZip(): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      const archive = archiver('zip', {
        zlib: { level: 9 },
      });

      const buffers: Buffer[] = [];
      archive.on('data', buffers.push.bind(buffers));
      archive.on('end', () => resolve(Buffer.concat(buffers)));
      archive.on('error', reject);

      // Get all active tables
      const allTables = await db
        .select()
        .from(tables)
        .where(eq(tables.is_active, true));

      for (const table of allTables) {
        try {
          let qrToken = table.qr_token;
          if (!qrToken) {
            // Generate new QR token for tables that don't have one
            const ttlSeconds = 60 * 60 * 24 * 365; // 1 year
            qrToken = this.qrService.generateTableToken(table.id, ttlSeconds);
            const expires_at = new Date(Date.now() + ttlSeconds * 1000);
            // Update table with new QR token
            await db
              .update(tables)
              .set({
                qr_token: qrToken,
                qr_generated_at: new Date().toISOString(),
                qr_expires_at: expires_at.toISOString(),
                updated_at: new Date().toISOString(),
              })
              .where(eq(tables.id, table.id));
          }

          const qrDataUrl = await this.generateQrCodeImage(qrToken);
          const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '');
          const buffer = Buffer.from(base64Data, 'base64');

          archive.append(buffer, {
            name: `table-${table.table_number}-qr.png`,
          });
        } catch (error) {
          console.error(`Failed to generate QR for table ${table.id}:`, error);
        }
      }

      archive.finalize();
    });
  }

  /**
   * Generate ZIP file with all QR codes as PNG files
   */
  async generateAllQrCodesPngZip(): Promise<Buffer> {
    return this.generateAllQrCodesZip();
  }

  /**
   * Generate combined PDF with all QR codes by merging individual PDFs
   */
  async generateCombinedQrCodesPdf(): Promise<Buffer> {
    // Get all active tables
    const allTables = await db
      .select()
      .from(tables)
      .where(eq(tables.is_active, true));

    // Create a new PDF document to hold all combined PDFs
    const combinedPdf = await PDFDocument.create();

    // Process each table
    for (const table of allTables) {
      try {
        // Generate the individual PDF for this table
        const tablePdfBuffer = await this.generateQrCodePdf(table);

        // Load the individual PDF
        const tablePdf = await PDFDocument.load(tablePdfBuffer);

        // Copy all pages from the individual PDF to the combined PDF
        const copiedPages = await combinedPdf.copyPages(tablePdf, tablePdf.getPageIndices());
        copiedPages.forEach((page) => {
          combinedPdf.addPage(page);
        });
      } catch (error) {
        console.error(`Failed to add PDF for table ${table.id}:`, error);
        // Continue with other tables even if one fails
      }
    }

    // Save the combined PDF
    const combinedPdfBytes = await combinedPdf.save();
    return Buffer.from(combinedPdfBytes);
  }
}
