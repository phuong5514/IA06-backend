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
  SetMetadata,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { OptionalJwtAuthGuard } from 'src/auth/optional-jwt-auth.guard';

// Custom decorator to mark routes as optional auth
export const OptionalAuth = () => SetMetadata('optionalAuth', true);

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * Create a new order (guest or authenticated)
   * POST /api/orders
   */
  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(@Request() req, @Body() createOrderDto: CreateOrderDto) {
    // Allow guest orders - userId will be null if not authenticated
    const userId = req.user?.userId || null;
    return this.ordersService.create(userId, createOrderDto);
  }

  /**
   * Get all orders for the authenticated user
   * GET /api/orders
   */
  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  async findAll(@Request() req) {
    const userId = req.user?.userId;
    const sessionId = req.user?.sessionId; // Extract sessionId from JWT if present
    return this.ordersService.findAll(userId, sessionId);
  }

  /**
   * Get a specific order by ID
   * GET /api/orders/:id
   */
  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  async findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const userId = req.user?.userId;
    const sessionId = req.user?.sessionId;
    return this.ordersService.findOne(id, userId, sessionId);
  }

  /**
   * Update order status
   * PATCH /api/orders/:id/status
   */
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
  async cancel(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const userId = req.user.userId;
    return this.ordersService.cancelOrder(id, userId);
  }

  /**
   * Get all orders for waiter/staff (with optional status filter)
   * GET /api/orders/waiter/all
   */
  @Get('waiter/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
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
  @UseGuards(JwtAuthGuard, RolesGuard)
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
  @UseGuards(JwtAuthGuard, RolesGuard)
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('waiter', 'admin', 'super_admin')
  async rejectOrder(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { reason?: string },
  ) {
    return this.ordersService.rejectOrder(id, body.reason);
  }
}
