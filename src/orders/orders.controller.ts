import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Request,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * Create a new order
   * POST /api/orders
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Request() req, @Body() createOrderDto: CreateOrderDto) {
    const userId = req.user.userId;
    return this.ordersService.create(userId, createOrderDto);
  }

  /**
   * Get all orders for the authenticated user
   * GET /api/orders
   */
  @Get()
  async findAll(@Request() req) {
    const userId = req.user.userId;
    return this.ordersService.findAll(userId);
  }

  /**
   * Get a specific order by ID
   * GET /api/orders/:id
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const userId = req.user.userId;
    return this.ordersService.findOne(id, userId);
  }

  /**
   * Update order status
   * PATCH /api/orders/:id/status
   */
  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
    @Request() req,
  ) {
    const userRole = req.user.role;
    
    // Staff (waiter, kitchen, admin) can update any order
    // Customers can only update their own orders
    const userId = ['waiter', 'kitchen', 'admin', 'super_admin'].includes(userRole)
      ? undefined
      : req.user.userId;
    
    return this.ordersService.updateStatus(
      id,
      updateOrderStatusDto.status,
      userId,
    );
  }

  /**
   * Cancel an order
   * POST /api/orders/:id/cancel
   */
  @Post(':id/cancel')
  async cancel(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const userId = req.user.userId;
    return this.ordersService.cancelOrder(id, userId);
  }

  /**
   * Get all orders for waiter/staff (with optional status filter)
   * GET /api/orders/waiter/all
   */
  @Get('waiter/all')
  @UseGuards(RolesGuard)
  @Roles('waiter', 'admin', 'super_admin')
  async getAllOrdersForWaiter(
    @Query('status') status?: string,
  ) {
    return this.ordersService.getAllOrders(status);
  }

  /**
   * Get all orders for kitchen staff (with optional status filter)
   * GET /api/orders/kitchen/all
   */
  @Get('kitchen/all')
  @UseGuards(RolesGuard)
  @Roles('kitchen', 'admin', 'super_admin')
  async getAllOrdersForKitchen(
    @Query('status') status?: string,
  ) {
    return this.ordersService.getAllOrders(status);
  }

  /**
   * Accept/Confirm an order (waiter only)
   * POST /api/orders/:id/accept
   */
  @Post(':id/accept')
  @UseGuards(RolesGuard)
  @Roles('waiter', 'admin', 'super_admin')
  async acceptOrder(
    @Param('id', ParseIntPipe) id: number,
    @Request() req,
  ) {
    return this.ordersService.acceptOrder(id, req.user.userId);
  }

  /**
   * Reject an order (waiter only)
   * POST /api/orders/:id/reject
   */
  @Post(':id/reject')
  @UseGuards(RolesGuard)
  @Roles('waiter', 'admin', 'super_admin')
  async rejectOrder(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { reason?: string },
  ) {
    return this.ordersService.rejectOrder(id, body.reason);
  }
}
