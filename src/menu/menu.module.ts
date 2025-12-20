import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { ItemsController } from './items.controller';
import { ItemsService } from './items.service';
import { ImageService } from './image.service';
import { ModifiersController } from './modifiers.controller';
import { ModifiersService } from './modifiers.service';

@Module({
  controllers: [CategoriesController, ItemsController, ModifiersController],
  providers: [CategoriesService, ItemsService, ImageService, ModifiersService],
  exports: [CategoriesService, ItemsService, ImageService, ModifiersService],
})
export class MenuModule {}
