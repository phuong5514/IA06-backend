import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { eq, desc, asc, and, sql, count } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { menuItemReviews, users, menuItems } from '../db/schema';
import { CreateReviewDto, AdminRespondToReviewDto, GetReviewsQueryDto } from './dto/review.dto';

@Injectable()
export class ReviewsService {
  private db;

  constructor() {
    this.db = drizzle(process.env.DATABASE_URL);
  }

  async createReview(userId: string, createReviewDto: CreateReviewDto) {
    // Check if menu item exists
    const menuItem = await this.db
      .select()
      .from(menuItems)
      .where(eq(menuItems.id, createReviewDto.menu_item_id))
      .limit(1);

    if (!menuItem.length) {
      throw new NotFoundException('Menu item not found');
    }

    // Check if user already reviewed this item
    const existingReview = await this.db
      .select()
      .from(menuItemReviews)
      .where(
        and(
          eq(menuItemReviews.menu_item_id, createReviewDto.menu_item_id),
          eq(menuItemReviews.user_id, userId)
        )
      )
      .limit(1);

    if (existingReview.length > 0) {
      throw new BadRequestException('You have already reviewed this item');
    }

    const [review] = await this.db
      .insert(menuItemReviews)
      .values({
        user_id: userId,
        menu_item_id: createReviewDto.menu_item_id,
        rating: createReviewDto.rating,
        comment: createReviewDto.comment,
      })
      .returning();

    return review;
  }

  async getReviews(queryDto: GetReviewsQueryDto) {
    const { menu_item_id, page = 1, limit = 10, sort_by = 'created_at', sort_order = 'desc' } = queryDto;
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [];
    if (menu_item_id) {
      conditions.push(eq(menuItemReviews.menu_item_id, menu_item_id));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const totalResult = await this.db
      .select({ count: count() })
      .from(menuItemReviews)
      .where(whereClause);

    const total = totalResult[0]?.count || 0;

    // Get reviews with user information
    const orderByClause = sort_order === 'asc' 
      ? asc(menuItemReviews[sort_by]) 
      : desc(menuItemReviews[sort_by]);

    const reviews = await this.db
      .select({
        id: menuItemReviews.id,
        menu_item_id: menuItemReviews.menu_item_id,
        user_id: menuItemReviews.user_id,
        rating: menuItemReviews.rating,
        comment: menuItemReviews.comment,
        admin_response: menuItemReviews.admin_response,
        admin_responded_at: menuItemReviews.admin_responded_at,
        admin_responded_by: menuItemReviews.admin_responded_by,
        created_at: menuItemReviews.created_at,
        updated_at: menuItemReviews.updated_at,
        user_name: users.name,
        user_email: users.email,
        user_profile_image: users.profile_image_url,
      })
      .from(menuItemReviews)
      .leftJoin(users, eq(menuItemReviews.user_id, users.id))
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(limit)
      .offset(offset);

    return {
      reviews,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  }

  async getAverageRating(menuItemId: number) {
    const result = await this.db
      .select({
        avg_rating: sql<number>`COALESCE(AVG(${menuItemReviews.rating}), 0)`,
        review_count: count(),
      })
      .from(menuItemReviews)
      .where(eq(menuItemReviews.menu_item_id, menuItemId));

    return {
      average_rating: parseFloat(result[0]?.avg_rating?.toString() || '0'),
      review_count: result[0]?.review_count || 0,
    };
  }

  async getMultipleAverageRatings(menuItemIds: number[]) {
    if (menuItemIds.length === 0) {
      return [];
    }

    const results = await this.db
      .select({
        menu_item_id: menuItemReviews.menu_item_id,
        avg_rating: sql<number>`COALESCE(AVG(${menuItemReviews.rating}), 0)`,
        review_count: count(),
      })
      .from(menuItemReviews)
      .where(sql`${menuItemReviews.menu_item_id} IN (${sql.join(menuItemIds.map(id => sql`${id}`), sql`, `)})`)
      .groupBy(menuItemReviews.menu_item_id);

    return results.map(r => ({
      menu_item_id: r.menu_item_id,
      average_rating: parseFloat(r.avg_rating?.toString() || '0'),
      review_count: r.review_count || 0,
    }));
  }

  async adminRespondToReview(
    reviewId: number, 
    adminId: string, 
    respondDto: AdminRespondToReviewDto
  ) {
    // Check if review exists
    const review = await this.db
      .select()
      .from(menuItemReviews)
      .where(eq(menuItemReviews.id, reviewId))
      .limit(1);

    if (!review.length) {
      throw new NotFoundException('Review not found');
    }

    // Update review with admin response
    const [updatedReview] = await this.db
      .update(menuItemReviews)
      .set({
        admin_response: respondDto.admin_response,
        admin_responded_at: new Date().toISOString(),
        admin_responded_by: adminId,
        updated_at: new Date().toISOString(),
      })
      .where(eq(menuItemReviews.id, reviewId))
      .returning();

    return updatedReview;
  }

  async deleteReview(reviewId: number, userId: string, isAdmin: boolean) {
    const review = await this.db
      .select()
      .from(menuItemReviews)
      .where(eq(menuItemReviews.id, reviewId))
      .limit(1);

    if (!review.length) {
      throw new NotFoundException('Review not found');
    }

    // Only allow deletion by review owner or admin
    if (!isAdmin && review[0].user_id !== userId) {
      throw new ForbiddenException('You can only delete your own reviews');
    }

    await this.db
      .delete(menuItemReviews)
      .where(eq(menuItemReviews.id, reviewId));

    return { message: 'Review deleted successfully' };
  }

  async updateReview(
    reviewId: number, 
    userId: string, 
    updateData: Partial<CreateReviewDto>
  ) {
    const review = await this.db
      .select()
      .from(menuItemReviews)
      .where(eq(menuItemReviews.id, reviewId))
      .limit(1);

    if (!review.length) {
      throw new NotFoundException('Review not found');
    }

    // Only allow update by review owner
    if (review[0].user_id !== userId) {
      throw new ForbiddenException('You can only update your own reviews');
    }

    const [updatedReview] = await this.db
      .update(menuItemReviews)
      .set({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .where(eq(menuItemReviews.id, reviewId))
      .returning();

    return updatedReview;
  }
}
