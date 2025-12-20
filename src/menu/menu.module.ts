import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { ItemsController } from './items.controller';
import { ItemsService } from './items.service';
import { ImageService } from './image.service';
import { ModifiersController } from './modifiers.controller';
import { ModifiersService } from './modifiers.service';
import { ExportController } from './export.controller';
import { ImportController } from './import.controller';

@Module({
  controllers: [CategoriesController, ItemsController, ModifiersController, ExportController, ImportController],
  providers: [CategoriesService, ItemsService, ImageService, ModifiersService],
  exports: [CategoriesService, ItemsService, ImageService, ModifiersService],
})
export class MenuModule {}
