import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, and, inArray } from 'drizzle-orm';
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

@Injectable()
export class PaymentsService {
  private db;
  private stripe: Stripe;

  constructor() {
    this.db = drizzle(process.env.DATABASE_URL);
    
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
  async getBillingInfo(userId: string) {
    // Get all served orders for this user that haven't been paid yet
    const servedOrders = await this.db
      .select({
        order: orders,
        orderItem: orderItems,
        menuItem: menuItems,
      })
      .from(orders)
      .leftJoin(orderItems, eq(orders.id, orderItems.order_id))
      .leftJoin(menuItems, eq(orderItems.menu_item_id, menuItems.id))
      .where(
        and(
          eq(orders.user_id, userId),
          eq(orders.status, 'served')
        )
      )
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
  async createPayment(userId: string, createPaymentDto: CreatePaymentDto) {
    const { orderIds, paymentMethod, notes } = createPaymentDto;

    // Validate all orders exist and belong to the user
    const ordersToProcess = await this.db
      .select()
      .from(orders)
      .where(
        and(
          inArray(orders.id, orderIds),
          eq(orders.user_id, userId),
          eq(orders.status, 'served')
        )
      )
      .execute();

    if (ordersToProcess.length !== orderIds.length) {
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
      throw new BadRequestException('Some orders have already been paid');
    }

    // Calculate total amount
    const totalAmount = ordersToProcess.reduce(
      (sum, order) => sum + parseFloat(order.total_amount),
      0
    );

    // Get table_id from first order (assuming all orders are from same table)
    const tableId = ordersToProcess[0].table_id;

    // Create payment record
    const [payment] = await this.db
      .insert(payments)
      .values({
        user_id: userId,
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

    return {
      payment,
      totalAmount: totalAmount.toFixed(2),
      orderCount: orderIds.length,
    };
  }

  /**
   * Create Stripe payment intent for online payment
   */
  async createStripePaymentIntent(userId: string, paymentId: number) {
    const [payment] = await this.db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.id, paymentId),
          eq(payments.user_id, userId)
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
        userId: userId,
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

    return paymentsWithOrders;
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
