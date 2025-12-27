import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Res,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import type { Response } from 'express';
import { TablesService } from './tables.service';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('admin/tables')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  /**
   * Get all tables with optional filters
   * GET /api/admin/tables
   */
  @Get()
  async getTables(
    @Query('status') status?: 'active' | 'inactive',
    @Query('location') location?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: 'table_number' | 'capacity' | 'created_at' | 'updated_at',
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    const filters = {
      status,
      location,
      search,
      sortBy,
      sortOrder,
    };
    return this.tablesService.getTables(filters);
  }

  /**
   * Get a single table by ID
   * GET /api/admin/tables/:id
   */
  @Get(':id')
  async getTableById(@Param('id') id: string) {
    return this.tablesService.getTableById(parseInt(id));
  }

  /**
   * Create a new table
   * POST /api/admin/tables
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createTable(
    @Body()
    data: {
      table_number: string;
      capacity: number;
      location?: string;
      description?: string;
    },
  ) {
    return this.tablesService.createTable(data);
  }

  /**
   * Update a table
   * PUT /api/admin/tables/:id
   */
  @Put(':id')
  async updateTable(
    @Param('id') id: string,
    @Body()
    data: {
      table_number?: string;
      capacity?: number;
      location?: string;
      description?: string;
    },
  ) {
    return this.tablesService.updateTable(parseInt(id), data);
  }

  /**
   * Update table status
   * PATCH /api/admin/tables/:id/status
   */
  @Patch(':id/status')
  async updateTableStatus(
    @Param('id') id: string,
    @Body() data: { is_active: boolean },
  ) {
    return this.tablesService.updateTableStatus(parseInt(id), data.is_active);
  }

  /**
   * Delete a table (soft delete)
   * DELETE /api/admin/tables/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTable(@Param('id') id: string) {
    await this.tablesService.deleteTable(parseInt(id));
  }

  /**
   * Generate QR code for a table
   * POST /api/admin/tables/:id/qr/generate
   */
  @Post(':id/qr/generate')
  async generateQrForTable(@Param('id') id: string) {
    return this.tablesService.generateQrForTable(parseInt(id));
  }

  /**
   * Download QR code as PNG
   * GET /api/admin/tables/:id/qr/download/png
   */
  @Get(':id/qr/download/png')
  async downloadQrPng(@Param('id') id: string, @Res() res: Response) {
    const tableId = parseInt(id);
    const table = await this.tablesService.getTableById(tableId);

    if (!table.qr_token) {
      throw new Error('No QR code generated for this table');
    }

    const qrCodeDataUrl = await this.tablesService.generateQrCodeImage(
      table.qr_token,
    );

    // Convert data URL to buffer
    const base64Data = qrCodeDataUrl.replace(/^data:image\/png;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    res.setHeader('Content-Type', 'image/png');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="table-${table.table_number}-qr.png"`,
    );
    res.send(buffer);
  }

  /**
   * Get QR code image for display
   * GET /api/admin/tables/:id/qr/image
   */
  @Get(':id/qr/image')
  async getQrImage(@Param('id') id: string, @Res() res: Response) {
    const tableId = parseInt(id);
    const table = await this.tablesService.getTableById(tableId);

    if (!table.qr_token) {
      throw new NotFoundException('No QR code generated for this table');
    }

    const qrCodeDataUrl = await this.tablesService.generateQrCodeImage(
      table.qr_token,
    );

    // Convert data URL to buffer
    const base64Data = qrCodeDataUrl.replace(/^data:image\/png;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.send(buffer);
  }

  /**
   * Download QR code as PDF
   * GET /api/admin/tables/:id/qr/download/pdf
   */
  @Get(':id/qr/download/pdf')
  async downloadQrPdf(@Param('id') id: string, @Res() res: Response) {
    const tableId = parseInt(id);
    const table = await this.tablesService.getTableById(tableId);

    if (!table.qr_token) {
      throw new Error('No QR code generated for this table');
    }

    const pdfBuffer = await this.tablesService.generateQrCodePdf(table);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="table-${table.table_number}-qr.pdf"`,
    );
    res.send(pdfBuffer);
  }

  /**
   * Download all QR codes as ZIP
   * GET /api/admin/tables/qr/download-all
   */
  @Get('qr/download-all')
  async downloadAllQrCodes(@Res() res: Response) {
    const zipBuffer = await this.tablesService.generateAllQrCodesZip();
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="all-tables-qr-codes.zip"',
    );
    res.send(zipBuffer);
  }

  /**
   * Download all QR codes as PNG files in ZIP
   * GET /api/admin/tables/qr/download-all-pngs
   */
  @Get('qr/download-all-pngs')
  async downloadAllQrCodesPng(@Res() res: Response) {
    const zipBuffer = await this.tablesService.generateAllQrCodesPngZip();
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="all-tables-qr-codes-png.zip"',
    );
    res.send(zipBuffer);
  }

  /**
   * Download combined PDF with all QR codes
   * GET /api/admin/tables/qr/download-combined-pdf
   */
  @Get('qr/download-combined-pdf')
  async downloadCombinedQrCodesPdf(@Res() res: Response) {
    const pdfBuffer = await this.tablesService.generateCombinedQrCodesPdf();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="all-tables-qr-codes-combined.pdf"',
    );
    res.send(pdfBuffer);
  }
}

// Keep the public verification endpoint
@Controller('tables')
export class PublicTablesController {
  constructor(private readonly tablesService: TablesService) {}

  /**
   * Verify a QR token and return table information with menu URL
   * GET /api/tables/verify/:qr_token
   */
  @Get('verify/:qr_token')
  @HttpCode(HttpStatus.OK)
  async verifyQrToken(@Param('qr_token') qrToken: string) {
    return this.tablesService.verifyQrToken(qrToken);
  }
}
