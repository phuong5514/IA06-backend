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
  ParseIntPipe,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ItemsService } from './items.service';
import { ImageService } from './image.service';
import { GcsService } from './gcs.service';
import { ReviewsService } from './reviews.service';
import { RolesGuard, Roles } from '../auth/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MenuItem } from '../db/schema';

@Controller('menu/items')
export class ItemsController {
  constructor(
    private readonly itemsService: ItemsService,
    private readonly imageService: ImageService,
    private readonly gcsService: GcsService,
    private readonly reviewsService: ReviewsService,
  ) {}

  @Get()
  async findAll(
    @Query('category_id') categoryId?: string,
    @Query('available_only') availableOnly?: string,
    @Query('sort_by') sortBy?: string,
    @Query('sort_order') sortOrder?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<{ items: any[]; total: number; page: number; limit: number }> {
    const categoryIdNum = categoryId ? parseInt(categoryId, 10) : undefined;
    const availableOnlyBool = availableOnly !== 'false';
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;

    const result = await this.itemsService.findAll(
      categoryIdNum,
      availableOnlyBool,
      sortBy,
      sortOrder,
      pageNum,
      limitNum
    );

    // Get ratings for all items
    const itemIds = result.items.map(item => item.id);
    const ratings = await this.reviewsService.getMultipleAverageRatings(itemIds);
    
    // Merge ratings into items
    const itemsWithRatings = result.items.map(item => {
      const rating = ratings.find(r => r.menu_item_id === item.id);
      return {
        ...item,
        average_rating: rating?.average_rating || 0,
        review_count: rating?.review_count || 0,
      };
    });

    return {
      ...result,
      items: itemsWithRatings,
    };
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const item = await this.itemsService.findOne(id);
    const rating = await this.reviewsService.getAverageRating(id);
    
    return {
      ...item,
      average_rating: rating.average_rating,
      review_count: rating.review_count,
    };
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  async create(@Body() createItemDto: any): Promise<MenuItem> {
    // TODO: Add proper DTO validation
    return this.itemsService.create(createItemDto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateItemDto: any,
  ): Promise<MenuItem> {
    // TODO: Add proper DTO validation
    return this.itemsService.update(id, updateItemDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.itemsService.remove(id);
  }

  @Post(':id/image/upload-url')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  async getUploadUrl(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { fileName: string; contentType: string },
  ) {
    return this.imageService.generateUploadUrl(body.fileName, body.contentType);
  }

  @Post(':id/image/confirm')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  async confirmImageUpload(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { gcsFileName: string },
  ) {
    return this.imageService.confirmImageUpload(id, body.gcsFileName);
  }

  @Get(':id/images')
  async getImages(@Param('id', ParseIntPipe) id: number) {
    return this.itemsService.getImages(id);
  }

  @Delete(':id/images/:imageId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  async deleteImage(
    @Param('id', ParseIntPipe) id: number,
    @Param('imageId', ParseIntPipe) imageId: number,
  ): Promise<{ message: string }> {
    await this.itemsService.deleteImage(imageId);
    return { message: 'Image deleted successfully' };
  }

  @Put(':id/images/:imageId/set-thumbnail')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  async setThumbnail(
    @Param('id', ParseIntPipe) id: number,
    @Param('imageId', ParseIntPipe) imageId: number,
  ): Promise<{ message: string }> {
    await this.itemsService.setThumbnail(id, imageId);
    return { message: 'Thumbnail set successfully' };
  }
}
