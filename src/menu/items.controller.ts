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
import { RolesGuard, Roles } from '../auth/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MenuItem } from '../db/schema';

@Controller('menu/items')
export class ItemsController {
  constructor(
    private readonly itemsService: ItemsService,
    private readonly imageService: ImageService,
    private readonly gcsService: GcsService,
  ) {}

  @Get()
  async findAll(
    @Query('category_id') categoryId?: string,
    @Query('available_only') availableOnly?: string,
    @Query('sort_by') sortBy?: string,
    @Query('sort_order') sortOrder?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<{ items: MenuItem[]; total: number; page: number; limit: number }> {
    const categoryIdNum = categoryId ? parseInt(categoryId, 10) : undefined;
    const availableOnlyBool = availableOnly !== 'false';
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;

    return this.itemsService.findAll(
      categoryIdNum,
      availableOnlyBool,
      sortBy,
      sortOrder,
      pageNum,
      limitNum
    );
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.itemsService.findOne(id);
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
}
