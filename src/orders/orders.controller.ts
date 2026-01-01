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
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

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
    const userId = req.user.userId;
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
}
