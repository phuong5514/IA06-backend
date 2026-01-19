import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { GuestSessionService } from './guest-session.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('guest-session')
export class GuestSessionController {
  constructor(private readonly guestSessionService: GuestSessionService) {}

  /**
   * Initialize a guest session for a table
   * POST /api/guest-session/initialize
   */
  @Post('initialize')
  async initializeGuestSession(
    @Body() body: { tableId: number; sessionId?: string },
  ) {
    const { tableId, sessionId } = body;

    if (!tableId) {
      throw new BadRequestException('Table ID is required');
    }

    // Generate session ID if not provided
    const finalSessionId =
      sessionId || this.guestSessionService.generateSessionId();

    const result = await this.guestSessionService.createGuestSession(
      tableId,
      finalSessionId,
    );

    return {
      success: true,
      message: 'Guest session initialized',
      ...result,
    };
  }

  /**
   * Transfer guest session data to authenticated account
   * POST /api/guest-session/transfer
   * Requires authentication
   */
  @Post('transfer')
  @UseGuards(JwtAuthGuard)
  async transferGuestSession(
    @Request() req,
    @Body() body: { guestUserId: string; sessionId: string },
  ) {
    const { guestUserId, sessionId } = body;
    const targetUserId = req.user.userId;

    if (!guestUserId || !sessionId) {
      throw new BadRequestException('Guest user ID and session ID are required');
    }

    const result = await this.guestSessionService.transferGuestOrders(
      guestUserId,
      sessionId,
      targetUserId,
    );

    return {
      success: true,
      message: `Successfully transferred ${result.ordersTransferred} orders`,
      ...result,
    };
  }
}
