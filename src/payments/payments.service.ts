import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { eq, and, inArray, isNull, or } from 'drizzle-orm';
import {
  payments,
  paymentOrders,
  Payment,
} from '../db/payment-schema';
import {
  orders,
  orderItems,
  menuItems,
  users,
} from '../db/schema';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ProcessCashPaymentDto } from './dto/process-cash-payment.dto';
import Stripe from 'stripe';
import { getDrizzleDb } from '../infrastructure/drizzle.provider';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private db;
  private stripe: Stripe;

  constructor() {
    this.db = getDrizzleDb();
    
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      throw new Error(
        'STRIPE_SECRET_KEY is not set in environment variables. Please add it to your .env file.'
      );
    }
    
    this.stripe = new Stripe(stripeKey, {
      apiVersion: '2025-12-15.clover',
    });
  }

  /**
   * Get billing information for a customer
   * Aggregates all delivered orders (status: 'served') that haven't been paid
   */
  async getBillingInfo(sessionId?: string, userId?: string) {
    this.logger.log(`Getting billing info - sessionId: ${sessionId}, userId: ${userId}`);
    
    // Determine filter based on sessionId or userId
    let whereConditions;
    if (sessionId && sessionId.trim() !== '') {
      whereConditions = and(
        eq(orders.session_id, sessionId),
        eq(orders.status, 'served')
      );
    } else if (userId && userId.trim() !== '') {
      whereConditions = and(
        eq(orders.user_id, userId),
        eq(orders.status, 'served')
      );
    } else {
      this.logger.warn('Neither sessionId nor userId provided');
      throw new BadRequestException('Either sessionId or userId must be provided');
    }

    // Get all served orders for this session/user that haven't been paid yet
    const servedOrders = await this.db
      .select({
        order: orders,
        orderItem: orderItems,
        menuItem: menuItems,
      })
      .from(orders)
      .leftJoin(orderItems, eq(orders.id, orderItems.order_id))
      .leftJoin(menuItems, eq(orderItems.menu_item_id, menuItems.id))
      .where(whereConditions)
      .execute();

    // Check which orders have already been paid
    const orderIds = [...new Set(servedOrders.map(so => so.order.id))];
    
    if (orderIds.length === 0) {
      return {
        orders: [],
        totalAmount: '0.00',
        unpaidOrders: [],
      };
    }

    const paidOrderIds = await this.db
      .select({
        orderId: paymentOrders.order_id,
      })
      .from(paymentOrders)
      .innerJoin(payments, eq(paymentOrders.payment_id, payments.id))
      .where(
        and(
          inArray(paymentOrders.order_id, orderIds as number[]),
          eq(payments.payment_status, 'completed')
        )
      )
      .execute();

    const paidOrderIdsSet = new Set(paidOrderIds.map(po => po.orderId));

    // Filter out paid orders
    const unpaidOrders = servedOrders.filter(
      so => !paidOrderIdsSet.has(so.order.id)
    );

    // Group by order
    const groupedOrders = unpaidOrders.reduce((acc, item) => {
      const orderId = item.order.id;
      if (!acc[orderId]) {
        acc[orderId] = {
          ...item.order,
          items: [],
        };
      }
      if (item.orderItem && item.menuItem) {
        acc[orderId].items.push({
          ...item.orderItem,
          menuItem: item.menuItem,
        });
      }
      return acc;
    }, {});

    const ordersArray = Object.values(groupedOrders) as any[];

    // Calculate total amount
    const totalAmount: number = ordersArray.reduce(
      (sum: number, order: any) => sum + parseFloat(order.total_amount),
      0
    );

    return {
      orders: ordersArray,
      totalAmount: totalAmount.toFixed(2),
      unpaidOrders: orderIds.filter(id => !paidOrderIdsSet.has(id)),
    };
  }

  /**
   * Create a payment (initiate payment process)
   */
  async createPayment(sessionId: string | undefined, userId: string | undefined, createPaymentDto: CreatePaymentDto) {
    try {
      const { orderIds, paymentMethod, notes } = createPaymentDto;

      this.logger.log(`Creating payment for session ${sessionId} or user ${userId}, orders: ${orderIds}, method: ${paymentMethod}`);

      // Determine filter based on sessionId or userId
      let whereConditions;
      if (sessionId && sessionId.trim() !== '') {
        whereConditions = and(
          inArray(orders.id, orderIds),
          eq(orders.session_id, sessionId),
          eq(orders.status, 'served')
        );
      } else if (userId && userId.trim() !== '') {
        whereConditions = and(
          inArray(orders.id, orderIds),
          eq(orders.user_id, userId),
          eq(orders.status, 'served')
        );
      } else {
        throw new BadRequestException('Either sessionId or userId must be provided');
      }

      // Validate all orders exist and belong to the session/user
      const ordersToProcess = await this.db
        .select()
        .from(orders)
        .where(whereConditions)
        .execute();

      if (ordersToProcess.length !== orderIds.length) {
        this.logger.warn(`Invalid orders: expected ${orderIds.length}, found ${ordersToProcess.length}`);
        throw new BadRequestException(
          'Some orders are invalid, do not belong to you, or are not in served status'
        );
      }

      // Check if any order is already paid
      const alreadyPaid = await this.db
        .select()
        .from(paymentOrders)
        .innerJoin(payments, eq(paymentOrders.payment_id, payments.id))
        .where(
          and(
            inArray(paymentOrders.order_id, orderIds),
            eq(payments.payment_status, 'completed')
          )
        )
        .execute();

      if (alreadyPaid.length > 0) {
        this.logger.warn(`Some orders already paid: ${alreadyPaid.map(p => p.payment_orders.order_id)}`);
        throw new BadRequestException('Some orders have already been paid');
      }

      // Calculate total amount
      const totalAmount = ordersToProcess.reduce(
        (sum, order) => sum + parseFloat(order.total_amount),
        0
      );

      // Get table_id from first order (assuming all orders are from same table)
      const tableId = ordersToProcess[0]?.table_id || null;

      if (!tableId) {
        this.logger.warn('No table_id found for orders');
      }

      // Create payment record
      const [payment] = await this.db
        .insert(payments)
        .values({
          user_id: userId || null,
          table_id: tableId,
          total_amount: totalAmount.toFixed(2),
          payment_method: paymentMethod,
          payment_status: 'pending',
          notes,
        })
        .returning()
        .execute();

      // Link orders to payment
      await this.db
        .insert(paymentOrders)
        .values(
          orderIds.map(orderId => ({
            payment_id: payment.id,
            order_id: orderId,
          }))
        )
        .execute();

      this.logger.log(`Payment created successfully: ${payment.id}`);

      return {
        payment,
        totalAmount: totalAmount.toFixed(2),
        orderCount: orderIds.length,
      };
    } catch (error) {
      this.logger.error(`Error creating payment: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Create Stripe payment intent for online payment
   */
  async createStripePaymentIntent(userId: string | undefined, paymentId: number) {
    // Build query condition - for guest users (userId is undefined/null), match payments with null user_id
    const userCondition = userId 
      ? eq(payments.user_id, userId)
      : isNull(payments.user_id);

    const [payment] = await this.db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.id, paymentId),
          userCondition
        )
      )
      .execute();

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.payment_status !== 'pending') {
      throw new BadRequestException('Payment is not in pending status');
    }

    if (payment.payment_method !== 'stripe') {
      throw new BadRequestException('Payment method is not Stripe');
    }

    // Create Stripe payment intent
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(parseFloat(payment.total_amount) * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        paymentId: payment.id.toString(),
        userId: userId || 'guest',
      },
    });

    // Update payment with Stripe payment intent ID
    await this.db
      .update(payments)
      .set({
        stripe_payment_intent_id: paymentIntent.id,
        updated_at: new Date().toISOString(),
      })
      .where(eq(payments.id, paymentId))
      .execute();

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  }

  /**
   * Confirm Stripe payment
   */
  async confirmStripePayment(paymentIntentId: string) {
    const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      // Update payment status
      await this.db
        .update(payments)
        .set({
          payment_status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .where(eq(payments.stripe_payment_intent_id, paymentIntentId))
        .execute();

      // Update order status to completed
      const [payment] = await this.db
        .select()
        .from(payments)
        .where(eq(payments.stripe_payment_intent_id, paymentIntentId))
        .execute();

      if (payment) {
        const orderIdsToUpdate = await this.db
          .select({ orderId: paymentOrders.order_id })
          .from(paymentOrders)
          .where(eq(paymentOrders.payment_id, payment.id))
          .execute();

        await this.db
          .update(orders)
          .set({
            status: 'completed',
            updated_at: new Date().toISOString(),
          })
          .where(inArray(orders.id, orderIdsToUpdate.map(o => o.orderId)))
          .execute();
      }

      return { success: true, message: 'Payment completed successfully' };
    }

    return { success: false, message: 'Payment not completed' };
  }

  /**
   * Charge using saved payment method
   */
  async chargeSavedCard(userId: string, paymentId: number, paymentMethodId: string) {
    // Get payment details
    const [payment] = await this.db
      .select()
      .from(payments)
      .where(eq(payments.id, paymentId))
      .execute();

    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.payment_status !== 'pending') {
      throw new Error('Payment already processed');
    }

    try {
      // Get or create Stripe customer for this user
      const [user] = await this.db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .execute();

      if (!user) {
        throw new Error('User not found');
      }

      let customerId = user.stripe_customer_id;

      // Create Stripe customer if it doesn't exist
      if (!customerId) {
        const customer = await this.stripe.customers.create({
          email: user.email,
          metadata: {
            userId: userId,
          },
        });
        customerId = customer.id;

        // Save the customer ID to the user record
        await this.db
          .update(users)
          .set({ stripe_customer_id: customerId })
          .where(eq(users.id, userId))
          .execute();

        this.logger.log(`Created Stripe customer ${customerId} for user ${userId}`);
      }

      // Retrieve the payment method to check if it's attached to customer
      let paymentMethod;
      try {
        paymentMethod = await this.stripe.paymentMethods.retrieve(paymentMethodId);
      } catch (error: any) {
        this.logger.error(`Payment method ${paymentMethodId} not found in Stripe: ${error.message}`);
        throw new Error('Payment method not found. Please add your card again.');
      }
      
      // Attach payment method to customer if not already attached
      if (paymentMethod.customer !== customerId) {
        try {
          await this.stripe.paymentMethods.attach(paymentMethodId, {
            customer: customerId,
          });
          this.logger.log(`Attached payment method ${paymentMethodId} to customer ${customerId}`);
        } catch (error: any) {
          this.logger.error(`Failed to attach payment method: ${error.message}`);
          // If the payment method was already used without a customer, we can't reuse it
          if (error.code === 'resource_missing' || error.message.includes('previously used')) {
            throw new Error('This payment method cannot be reused. Please add your card again.');
          }
          throw error;
        }
      }

      // Create a payment intent with the saved payment method and customer
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(parseFloat(payment.total_amount) * 100), // Convert to cents
        currency: 'usd',
        customer: customerId,
        payment_method: paymentMethodId,
        confirm: true, // Automatically confirm the payment
        off_session: true, // Indicate that customer is not present
        metadata: {
          paymentId: paymentId.toString(),
          userId: userId,
        },
      });

      // Update payment with intent ID
      await this.db
        .update(payments)
        .set({
          stripe_payment_intent_id: paymentIntent.id,
          updated_at: new Date().toISOString(),
        })
        .where(eq(payments.id, paymentId))
        .execute();

      if (paymentIntent.status === 'succeeded') {
        // Update payment status
        await this.db
          .update(payments)
          .set({
            payment_status: 'completed',
            updated_at: new Date().toISOString(),
          })
          .where(eq(payments.id, paymentId))
          .execute();

        // Update order status to completed
        const orderIdsToUpdate = await this.db
          .select({ orderId: paymentOrders.order_id })
          .from(paymentOrders)
          .where(eq(paymentOrders.payment_id, paymentId))
          .execute();

        await this.db
          .update(orders)
          .set({
            status: 'completed',
            updated_at: new Date().toISOString(),
          })
          .where(inArray(orders.id, orderIdsToUpdate.map(o => o.orderId)))
          .execute();

        return { success: true, message: 'Payment completed successfully' };
      }

      return { success: false, message: 'Payment requires additional action' };
    } catch (error: any) {
      console.error('Error charging saved card:', error);
      this.logger.error(`Error charging saved card: ${error.message}`, error.stack);
      
      // Update payment status to failed
      await this.db
        .update(payments)
        .set({
          payment_status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .where(eq(payments.id, paymentId))
        .execute();

      // Handle specific Stripe errors
      if (error.type === 'StripeCardError') {
        // Card was declined or has issues
        if (error.code === 'card_declined') {
          const declineCode = error.decline_code;
          if (declineCode === 'insufficient_funds') {
            throw new BadRequestException('Insufficient funds. Please use another payment method.');
          } else if (declineCode === 'generic_decline') {
            throw new BadRequestException('Your card was declined. Please check your card details or try another card.');
          } else {
            throw new BadRequestException(`Your card was declined: ${error.message}`);
          }
        } else if (error.code === 'expired_card') {
          throw new BadRequestException('Your card has expired. Please update your card or use another payment method.');
        } else if (error.code === 'incorrect_cvc') {
          throw new BadRequestException('Incorrect CVC code. Please check your card details.');
        } else {
          throw new BadRequestException(error.message || 'Card payment failed');
        }
      }

      throw new BadRequestException(error.message || 'Failed to process payment');
    }
  }

  /**
   * Process cash payment (for waiters)
   */
  async processCashPayment(
    waiterId: string,
    processCashPaymentDto: ProcessCashPaymentDto
  ) {
    const { paymentId, notes } = processCashPaymentDto;

    const [payment] = await this.db
      .select()
      .from(payments)
      .where(eq(payments.id, paymentId))
      .execute();

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.payment_status !== 'pending') {
      throw new BadRequestException('Payment is not in pending status');
    }

    if (payment.payment_method !== 'cash') {
      throw new BadRequestException('Payment method is not cash');
    }

    // Update payment status
    await this.db
      .update(payments)
      .set({
        payment_status: 'completed',
        paid_by_user_id: waiterId,
        notes: notes || payment.notes,
        updated_at: new Date().toISOString(),
      })
      .where(eq(payments.id, paymentId))
      .execute();

    // Update order status to completed
    const orderIdsToUpdate = await this.db
      .select({ orderId: paymentOrders.order_id })
      .from(paymentOrders)
      .where(eq(paymentOrders.payment_id, paymentId))
      .execute();

    await this.db
      .update(orders)
      .set({
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .where(inArray(orders.id, orderIdsToUpdate.map(o => o.orderId)))
      .execute();

    return {
      success: true,
      message: 'Cash payment processed successfully',
      payment,
    };
  }

  /**
   * Get all pending payments for waiter
   */
  async getPendingPayments() {
    const pendingPayments = await this.db
      .select({
        payment: payments,
        user: users,
      })
      .from(payments)
      .leftJoin(users, eq(payments.user_id, users.id))
      .where(eq(payments.payment_status, 'pending'))
      .execute();

    // Get orders for each payment
    const paymentsWithOrders = await Promise.all(
      pendingPayments.map(async ({ payment, user }) => {
        const ordersList = await this.db
          .select({
            order: orders,
            orderItem: orderItems,
            menuItem: menuItems,
          })
          .from(paymentOrders)
          .innerJoin(orders, eq(paymentOrders.order_id, orders.id))
          .leftJoin(orderItems, eq(orders.id, orderItems.order_id))
          .leftJoin(menuItems, eq(orderItems.menu_item_id, menuItems.id))
          .where(eq(paymentOrders.payment_id, payment.id))
          .execute();

        // Group orders
        const groupedOrders = ordersList.reduce((acc, item) => {
          const orderId = item.order.id;
          if (!acc[orderId]) {
            acc[orderId] = {
              ...item.order,
              items: [],
            };
          }
          if (item.orderItem && item.menuItem) {
            acc[orderId].items.push({
              ...item.orderItem,
              menuItem: item.menuItem,
            });
          }
          return acc;
        }, {});

        return {
          payment,
          user,
          orders: Object.values(groupedOrders),
        };
      })
    );

    // Filter out payments where all associated orders are already completed
    // This handles cases where a payment intent was created but the order was paid via another method
    return paymentsWithOrders.filter(item => {
      if (item.orders.length === 0) return false;
      const allOrdersCompleted = item.orders.every((order: any) => order.status === 'completed' || order.status === 'cancelled');
      return !allOrdersCompleted;
    });
  }

  /**
   * Get payment details
   */
  async getPaymentDetails(paymentId: number, userId?: string) {
    let query = this.db
      .select({
        payment: payments,
        user: users,
      })
      .from(payments)
      .leftJoin(users, eq(payments.user_id, users.id))
      .where(eq(payments.id, paymentId));

    if (userId) {
      query = query.where(
        and(
          eq(payments.id, paymentId),
          eq(payments.user_id, userId)
        )
      );
    }

    const [result] = await query.execute();

    if (!result) {
      throw new NotFoundException('Payment not found');
    }

    // Get orders for this payment
    const ordersList = await this.db
      .select({
        order: orders,
        orderItem: orderItems,
        menuItem: menuItems,
      })
      .from(paymentOrders)
      .innerJoin(orders, eq(paymentOrders.order_id, orders.id))
      .leftJoin(orderItems, eq(orders.id, orderItems.order_id))
      .leftJoin(menuItems, eq(orderItems.menu_item_id, menuItems.id))
      .where(eq(paymentOrders.payment_id, paymentId))
      .execute();

    // Group orders
    const groupedOrders = ordersList.reduce((acc, item) => {
      const orderId = item.order.id;
      if (!acc[orderId]) {
        acc[orderId] = {
          ...item.order,
          items: [],
        };
      }
      if (item.orderItem && item.menuItem) {
        acc[orderId].items.push({
          ...item.orderItem,
          menuItem: item.menuItem,
        });
      }
      return acc;
    }, {});

    return {
      payment: result.payment,
      user: result.user,
      orders: Object.values(groupedOrders),
    };
  }
}
