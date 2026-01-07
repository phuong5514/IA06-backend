import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ProcessCashPaymentDto } from './dto/process-cash-payment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Get billing information for current customer
   * GET /api/payments/billing
   */
  @Get('billing')
  async getBillingInfo(@Request() req) {
    const userId = req.user.userId;
    return this.paymentsService.getBillingInfo(userId);
  }

  /**
   * Create a payment
   * POST /api/payments
   */
  @Post()
  async createPayment(@Request() req, @Body() createPaymentDto: CreatePaymentDto) {
    const userId = req.user.userId;
    return this.paymentsService.createPayment(userId, createPaymentDto);
  }

  /**
   * Create Stripe payment intent
   * POST /api/payments/:id/stripe-intent
   */
  @Post(':id/stripe-intent')
  async createStripePaymentIntent(
    @Request() req,
    @Param('id', ParseIntPipe) paymentId: number
  ) {
    const userId = req.user.userId;
    return this.paymentsService.createStripePaymentIntent(userId, paymentId);
  }

  /**
   * Confirm Stripe payment
   * POST /api/payments/stripe/confirm
   */
  @Post('stripe/confirm')
  async confirmStripePayment(@Body('paymentIntentId') paymentIntentId: string) {
    return this.paymentsService.confirmStripePayment(paymentIntentId);
  }

  /**
   * Charge using saved payment method
   * POST /api/payments/:id/charge-saved-card
   */
  @Post(':id/charge-saved-card')
  async chargeSavedCard(
    @Request() req,
    @Param('id', ParseIntPipe) paymentId: number,
    @Body('paymentMethodId') paymentMethodId: string
  ) {
    const userId = req.user.userId;
    return this.paymentsService.chargeSavedCard(userId, paymentId, paymentMethodId);
  }

  /**
   * Process cash payment (waiter only)
   * POST /api/payments/cash/process
   */
  @Post('cash/process')
  @UseGuards(RolesGuard)
  @Roles('waiter', 'admin', 'super_admin')
  async processCashPayment(
    @Request() req,
    @Body() processCashPaymentDto: ProcessCashPaymentDto
  ) {
    const waiterId = req.user.userId;
    return this.paymentsService.processCashPayment(waiterId, processCashPaymentDto);
  }

  /**
   * Get all pending payments (waiter only)
   * GET /api/payments/pending
   */
  @Get('pending')
  @UseGuards(RolesGuard)
  @Roles('waiter', 'admin', 'super_admin')
  async getPendingPayments() {
    return this.paymentsService.getPendingPayments();
  }

  /**
   * Get payment details
   * GET /api/payments/:id
   */
  @Get(':id')
  async getPaymentDetails(
    @Request() req,
    @Param('id', ParseIntPipe) paymentId: number
  ) {
    const userRole = req.user.role;
    const userId = ['waiter', 'admin', 'super_admin'].includes(userRole)
      ? undefined
      : req.user.userId;
    
    return this.paymentsService.getPaymentDetails(paymentId, userId);
  }
}
