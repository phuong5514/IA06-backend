import { Controller, Get, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { TablesService } from './tables.service';

@Controller('tables')
export class TablesController {
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
