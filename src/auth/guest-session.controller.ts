import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { GuestSessionService } from './guest-session.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard, Roles } from './roles.guard';

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

  /**
   * End a session and cancel all incomplete orders
   * POST /api/guest-session/end
   * Can be called by authenticated users (guests or regular) or waiters
   */
  @Post('end')
  @UseGuards(JwtAuthGuard)
  async endSession(
    @Request() req,
    @Body() body: { sessionId: string; tableId?: number },
  ) {
    const { sessionId, tableId } = body;

    if (!sessionId) {
      throw new BadRequestException('Session ID is required');
    }

    const result = await this.guestSessionService.endSession(
      sessionId,
      tableId,
    );

    return {
      success: true,
      message: `Session ended. ${result.ordersCancelled} incomplete orders cancelled`,
      ...result,
    };
  }

  /**
   * Get all active sessions
   * GET /api/guest-session/active-sessions
   * Requires waiter, admin, or super_admin role
   */
  @Get('active-sessions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('waiter', 'admin', 'super_admin')
  async getActiveSessions() {
    const sessions = await this.guestSessionService.getActiveSessions();

    return {
      success: true,
      sessions,
    };
  }

  /**
   * Delete a guest user account
   * POST /api/guest-session/delete-guest
   * Requires authentication
   */
  @Post('delete-guest')
  @UseGuards(JwtAuthGuard)
  async deleteGuestUser(
    @Request() req,
    @Body() body: { userId: string },
  ) {
    const { userId } = body;

    if (!userId) {
      throw new BadRequestException('User ID is required');
    }

    const result = await this.guestSessionService.deleteGuestUser(userId);

    return {
      success: result.success,
      message: result.success
        ? 'Guest user deleted successfully'
        : 'Failed to delete guest user',
    };
  }
}
