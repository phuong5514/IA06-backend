import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, desc, and, or, sql } from 'drizzle-orm';
import {
  orders,
  orderItems,
  orderItemModifiers,
  menuItems,
  modifierOptions,
  modifierGroups,
  Order,
  OrderItem,
  users,
} from '../db/schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus } from './dto/update-order-status.dto';
import { OrdersGateway } from '../websocket/orders.gateway';

@Injectable()
export class OrdersService {
  private db;

  constructor(private ordersGateway: OrdersGateway) {
    this.db = drizzle(process.env.DATABASE_URL);
  }

  async create(userId: string, createOrderDto: CreateOrderDto): Promise<Order> {
    try {
      // Validate all menu items exist and calculate prices
      const itemsWithPrices = await Promise.all(
        createOrderDto.items.map(async (item) => {
          const [menuItem] = await this.db
            .select()
            .from(menuItems)
            .where(eq(menuItems.id, item.menu_item_id))
            .execute();

          if (!menuItem) {
            throw new BadRequestException(
              `Menu item with ID ${item.menu_item_id} not found`,
            );
          }

          if (menuItem.status !== 'available') {
            throw new BadRequestException(
              `Menu item "${menuItem.name}" is not available`,
            );
          }

          // Calculate modifier prices
          let modifierTotal = 0;
          const validatedModifiers = await Promise.all(
            item.modifiers.map(async (modifier) => {
              const [modOption] = await this.db
                .select()
                .from(modifierOptions)
                .where(eq(modifierOptions.id, modifier.modifier_option_id))
                .execute();

              if (!modOption) {
                throw new BadRequestException(
                  `Modifier option with ID ${modifier.modifier_option_id} not found`,
                );
              }

              if (!modOption.is_available) {
                throw new BadRequestException(
                  `Modifier "${modOption.name}" is not available`,
                );
              }

              modifierTotal += parseFloat(modOption.price_adjustment);
              return {
                ...modifier,
                price_adjustment: modOption.price_adjustment,
              };
            }),
          );

          const unitPrice =
            parseFloat(menuItem.price) + modifierTotal;
          const totalPrice = unitPrice * item.quantity;

          return {
            ...item,
            unit_price: unitPrice.toFixed(2),
            total_price: totalPrice.toFixed(2),
            modifiers: validatedModifiers,
          };
        }),
      );

      // Calculate order total
      const totalAmount = itemsWithPrices
        .reduce((sum, item) => sum + parseFloat(item.total_price), 0)
        .toFixed(2);

      // Create order
      const [order] = await this.db
        .insert(orders)
        .values({
          user_id: userId,
          table_id: createOrderDto.table_id || null,
          status: 'pending',
          total_amount: totalAmount,
        })
        .returning();

      // Create order items
      for (const item of itemsWithPrices) {
        const [orderItem] = await this.db
          .insert(orderItems)
          .values({
            order_id: order.id,
            menu_item_id: item.menu_item_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
            special_instructions: item.special_instructions || null,
          })
          .returning();

        // Create order item modifiers
        if (item.modifiers.length > 0) {
          await this.db
            .insert(orderItemModifiers)
            .values(
              item.modifiers.map((mod) => ({
                order_item_id: orderItem.id,
                modifier_group_id: mod.modifier_group_id,
                modifier_option_id: mod.modifier_option_id,
                price_adjustment: mod.price_adjustment,
              })),
            )
            .execute();
        }
      }

      // Notify about new order via WebSocket
      this.ordersGateway.notifyNewOrder(order);

      return order;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  async findAll(userId: string): Promise<any> {
    const userOrders = await this.db
      .select()
      .from(orders)
      .where(eq(orders.user_id, userId))
      .orderBy(desc(orders.created_at))
      .execute();

    // Get item counts for each order
    const ordersWithCounts = await Promise.all(
      userOrders.map(async (order) => {
        const items = await this.db
          .select()
          .from(orderItems)
          .where(eq(orderItems.order_id, order.id))
          .execute();

        const itemsCount = items.reduce(
          (sum, item) => sum + item.quantity,
          0,
        );

        return {
          ...order,
          items_count: itemsCount,
        };
      }),
    );

    return { orders: ordersWithCounts };
  }

  async findOne(id: number, userId: string): Promise<any> {
    const [order] = await this.db
      .select()
      .from(orders)
      .where(and(eq(orders.id, id), eq(orders.user_id, userId)))
      .execute();

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    // Get order items with menu item details
    const items = await this.db
      .select({
        orderItem: orderItems,
        menuItem: menuItems,
      })
      .from(orderItems)
      .innerJoin(menuItems, eq(orderItems.menu_item_id, menuItems.id))
      .where(eq(orderItems.order_id, id))
      .execute();

    // Get modifiers for each item
    const itemsWithModifiers = await Promise.all(
      items.map(async (item) => {
        const modifiers = await this.db
          .select({
            modifier: orderItemModifiers,
            modifierOption: modifierOptions,
            modifierGroup: modifierGroups,
          })
          .from(orderItemModifiers)
          .innerJoin(
            modifierOptions,
            eq(orderItemModifiers.modifier_option_id, modifierOptions.id),
          )
          .innerJoin(
            modifierGroups,
            eq(orderItemModifiers.modifier_group_id, modifierGroups.id),
          )
          .where(eq(orderItemModifiers.order_item_id, item.orderItem.id))
          .execute();

        return {
          id: item.orderItem.id,
          menu_item_id: item.orderItem.menu_item_id,
          menu_item_name: item.menuItem.name,
          quantity: item.orderItem.quantity,
          base_price: item.menuItem.price,
          price: item.orderItem.total_price,
          unit_price: item.orderItem.unit_price,
          special_instructions: item.orderItem.special_instructions,
          modifiers: modifiers.map((m) => ({
            modifier_group_name: m.modifierGroup.name,
            modifier_option_name: m.modifierOption.name,
            price_adjustment: m.modifier.price_adjustment,
          })),
        };
      }),
    );

    return {
      ...order,
      items: itemsWithModifiers,
    };
  }

  async updateStatus(
    id: number,
    status: OrderStatus,
    userId?: string,
  ): Promise<Order> {
    // If userId is provided, verify ownership
    if (userId) {
      const [existingOrder] = await this.db
        .select()
        .from(orders)
        .where(and(eq(orders.id, id), eq(orders.user_id, userId)))
        .execute();

      if (!existingOrder) {
        throw new NotFoundException(`Order with ID ${id} not found`);
      }
    }

    // Get previous status before updating
    const [orderBeforeUpdate] = await this.db
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .execute();

    if (!orderBeforeUpdate) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    const previousStatus = orderBeforeUpdate.status;

    const [updatedOrder] = await this.db
      .update(orders)
      .set({ status, updated_at: new Date().toISOString() })
      .where(eq(orders.id, id))
      .returning();

    if (!updatedOrder) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    // Notify about status change via WebSocket
    this.ordersGateway.notifyStatusChange(updatedOrder, previousStatus);

    return updatedOrder;
  }

  async cancelOrder(id: number, userId: string): Promise<Order> {
    const [order] = await this.db
      .select()
      .from(orders)
      .where(and(eq(orders.id, id), eq(orders.user_id, userId)))
      .execute();

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    // Only allow cancellation if order is pending or accepted
    if (order.status !== 'pending' && order.status !== 'accepted') {
      throw new BadRequestException(
        `Cannot cancel order with status "${order.status}"`,
      );
    }

    return this.updateStatus(id, OrderStatus.CANCELLED, userId);
  }

  async getAllOrders(statusFilter?: string): Promise<any> {
    let query = this.db
      .select({
        order: orders,
        user: {
          id: users.id,
          email: users.email,
          name: users.name,
        },
      })
      .from(orders)
      .innerJoin(users, eq(orders.user_id, users.id))
      .orderBy(desc(orders.created_at));

    // Apply status filter if provided
    let allOrders;
    if (statusFilter && statusFilter !== 'all') {
      allOrders = await query
        .where(eq(orders.status, statusFilter as any))
        .execute();
    } else {
      allOrders = await query.execute();
    }

    // Get item counts and details for each order
    const ordersWithDetails = await Promise.all(
      allOrders.map(async (orderData) => {
        const items = await this.db
          .select({
            orderItem: orderItems,
            menuItem: menuItems,
          })
          .from(orderItems)
          .innerJoin(menuItems, eq(orderItems.menu_item_id, menuItems.id))
          .where(eq(orderItems.order_id, orderData.order.id))
          .execute();

        const itemsCount = items.reduce(
          (sum, item) => sum + item.orderItem.quantity,
          0,
        );

        // Get modifiers for each item
        const itemsWithModifiers = await Promise.all(
          items.map(async (item) => {
            const modifiers = await this.db
              .select({
                modifierGroup: modifierGroups,
                modifierOption: modifierOptions,
                orderItemModifier: orderItemModifiers,
              })
              .from(orderItemModifiers)
              .innerJoin(
                modifierGroups,
                eq(orderItemModifiers.modifier_group_id, modifierGroups.id),
              )
              .innerJoin(
                modifierOptions,
                eq(orderItemModifiers.modifier_option_id, modifierOptions.id),
              )
              .where(eq(orderItemModifiers.order_item_id, item.orderItem.id))
              .execute();

            return {
              id: item.orderItem.id,
              menu_item_name: item.menuItem.name,
              quantity: item.orderItem.quantity,
              price: item.orderItem.total_price,
              special_instructions: item.orderItem.special_instructions,
              modifiers: modifiers.map((mod) => ({
                modifier_group_name: mod.modifierGroup.name,
                modifier_option_name: mod.modifierOption.name,
                price_adjustment: mod.orderItemModifier.price_adjustment,
              })),
            };
          }),
        );

        return {
          ...orderData.order,
          user: orderData.user,
          items_count: itemsCount,
          items: itemsWithModifiers,
        };
      }),
    );

    return { orders: ordersWithDetails };
  }

  async acceptOrder(id: number, waiterId: string): Promise<Order> {
    const [order] = await this.db
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .execute();

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    if (order.status !== 'pending') {
      throw new BadRequestException(
        `Can only accept orders with pending status. Current status: ${order.status}`,
      );
    }

    // Update to accepted status - waiter has accepted the order
    const updatedOrder = await this.updateStatus(id, OrderStatus.ACCEPTED);
    
    // Notify about order acceptance via WebSocket
    this.ordersGateway.notifyOrderAccepted(updatedOrder);
    
    return updatedOrder;
  }

  async rejectOrder(id: number, reason?: string): Promise<Order> {
    const [order] = await this.db
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .execute();

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    if (order.status !== 'pending') {
      throw new BadRequestException(
        `Can only reject orders with pending status. Current status: ${order.status}`,
      );
    }

    // Update to rejected status with reason
    const [updatedOrder] = await this.db
      .update(orders)
      .set({
        status: OrderStatus.REJECTED,
        rejection_reason: reason || 'No reason provided',
        updated_at: new Date().toISOString(),
      })
      .where(eq(orders.id, id))
      .returning();

    // Notify about order rejection via WebSocket
    this.ordersGateway.notifyOrderRejected(updatedOrder);

    return updatedOrder;
  }
}
