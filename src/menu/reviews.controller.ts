import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, AdminRespondToReviewDto, GetReviewsQueryDto } from './dto/review.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a review for a menu item' })
  @ApiResponse({ status: 201, description: 'Review created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - user already reviewed this item' })
  @ApiResponse({ status: 404, description: 'Menu item not found' })
  async createReview(@Req() req, @Body() createReviewDto: CreateReviewDto) {
    return this.reviewsService.createReview(req.user.userId, createReviewDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get reviews with pagination and filtering' })
  @ApiResponse({ status: 200, description: 'Returns paginated reviews' })
  async getReviews(@Query() queryDto: GetReviewsQueryDto) {
    // Convert string parameters to numbers if needed
    if (queryDto.page) queryDto.page = parseInt(queryDto.page as any);
    if (queryDto.limit) queryDto.limit = parseInt(queryDto.limit as any);
    if (queryDto.menu_item_id) queryDto.menu_item_id = parseInt(queryDto.menu_item_id as any);
    
    return this.reviewsService.getReviews(queryDto);
  }

  @Get('average/:menuItemId')
  @ApiOperation({ summary: 'Get average rating for a menu item' })
  @ApiResponse({ status: 200, description: 'Returns average rating and review count' })
  async getAverageRating(@Param('menuItemId', ParseIntPipe) menuItemId: number) {
    return this.reviewsService.getAverageRating(menuItemId);
  }

  @Put(':id/respond')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'manager')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin responds to a review' })
  @ApiResponse({ status: 200, description: 'Response added successfully' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  async respondToReview(
    @Param('id', ParseIntPipe) id: number,
    @Req() req,
    @Body() respondDto: AdminRespondToReviewDto,
  ) {
    return this.reviewsService.adminRespondToReview(id, req.user.userId, respondDto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update own review' })
  @ApiResponse({ status: 200, description: 'Review updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - can only update own reviews' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  async updateReview(
    @Param('id', ParseIntPipe) id: number,
    @Req() req,
    @Body() updateDto: Partial<CreateReviewDto>,
  ) {
    return this.reviewsService.updateReview(id, req.user.userId, updateDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a review' })
  @ApiResponse({ status: 200, description: 'Review deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - can only delete own reviews' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  async deleteReview(@Param('id', ParseIntPipe) id: number, @Req() req) {
    const isAdmin = req.user.role === 'admin' || req.user.role === 'manager';
    return this.reviewsService.deleteReview(id, req.user.userId, isAdmin);
  }
}
