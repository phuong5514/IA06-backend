import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { ItemsController } from './items.controller';
import { ItemsService } from './items.service';
import { ImageService } from './image.service';
import { GcsService } from './gcs.service';
import { ModifiersController } from './modifiers.controller';
import { ModifiersService } from './modifiers.service';
import { ExportController } from './export.controller';
import { ImportController } from './import.controller';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
  controllers: [
    CategoriesController,
    ItemsController,
    ModifiersController,
    ExportController,
    ImportController,
    ReviewsController,
  ],
  providers: [
    CategoriesService,
    ItemsService,
    ImageService,
    GcsService,
    ModifiersService,
    ReviewsService,
  ],
  exports: [
    CategoriesService,
    ItemsService,
    ImageService,
    GcsService,
    ModifiersService,
    ReviewsService,
  ],
})
export class MenuModule {}
