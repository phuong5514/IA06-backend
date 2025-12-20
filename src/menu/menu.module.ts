import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { ItemsController } from './items.controller';
import { ItemsService } from './items.service';
import { ImageService } from './image.service';

@Module({
  controllers: [CategoriesController, ItemsController],
  providers: [CategoriesService, ItemsService, ImageService],
  exports: [CategoriesService, ItemsService, ImageService],
})
export class MenuModule {}
