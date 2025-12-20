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
import { RolesGuard, Roles } from '../auth/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MenuItem } from '../db/schema';

@Controller('menu/items')
export class ItemsController {
  constructor(
    private readonly itemsService: ItemsService,
    private readonly imageService: ImageService,
  ) {}

  @Get()
  async findAll(
    @Query('category_id') categoryId?: string,
    @Query('available_only') availableOnly?: string,
  ): Promise<MenuItem[]> {
    const categoryIdNum = categoryId ? parseInt(categoryId, 10) : undefined;
    const availableOnlyBool = availableOnly !== 'false';

    return this.itemsService.findAll(categoryIdNum, availableOnlyBool);
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

  @Post(':id/image')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  @UseInterceptors(FileInterceptor('image'))
  async uploadImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.imageService.processAndSaveImage(id, file);
  }
}