import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { parse } from 'csv-parse/sync';
import { ItemsService } from './items.service';
import { CategoriesService } from './categories.service';
import { ModifiersService } from './modifiers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

interface CsvRecord {
  category_name?: string;
  category_description?: string;
  item_name?: string;
  item_description?: string;
  item_price?: string;
  item_image_url?: string;
  item_dietary_tags?: string;
  item_is_available?: string;
  modifier_group_name?: string;
  modifier_group_type?: string;
  modifier_option_name?: string;
  modifier_option_price_adjustment?: string;
  modifier_option_is_available?: string;
}

interface ImportResult {
  success: boolean;
  imported: {
    categories: number;
    items: number;
    modifiers: number;
  };
  errors: string[];
}

@Controller('menu/import')
export class ImportController {
  constructor(
    private readonly itemsService: ItemsService,
    private readonly categoriesService: CategoriesService,
    private readonly modifiersService: ModifiersService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  @UseInterceptors(FileInterceptor('file'))
  async importMenu(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ImportResult> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!file.originalname.endsWith('.csv')) {
      throw new BadRequestException('File must be a CSV');
    }

    try {
      // Parse CSV
      const records: CsvRecord[] = parse(file.buffer.toString(), {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      // Validate CSV structure
      const requiredFields = [
        'category_name',
        'item_name',
        'item_price',
        'item_is_available',
      ];

      const firstRecord = records[0];
      if (!firstRecord) {
        throw new BadRequestException('CSV file is empty');
      }

      for (const field of requiredFields) {
        if (!(field in firstRecord)) {
          throw new BadRequestException(
            `Required field '${field}' is missing from CSV`,
          );
        }
      }

      // Process import
      const result: ImportResult = {
        success: true,
        imported: { categories: 0, items: 0, modifiers: 0 },
        errors: [],
      };

      // Track created entities to avoid duplicates
      const categoryMap = new Map<string, number>();
      const itemMap = new Map<string, number>();
      const modifierGroupMap = new Map<string, number>();

      for (const record of records) {
        try {
          // Process category
          const categoryName = record.category_name?.trim();
          if (!categoryName) {
            result.errors.push(
              `Row ${records.indexOf(record) + 1}: Category name is required`,
            );
            continue;
          }

          let categoryId = categoryMap.get(categoryName);
          if (!categoryId) {
            // Check if category exists
            const existingCategories = await this.categoriesService.findAll();
            const existingCategory = existingCategories.find(
              (c) => c.name === categoryName,
            );

            if (existingCategory) {
              categoryId = existingCategory.id;
            } else {
              // Create new category
              const newCategory = await this.categoriesService.create({
                name: categoryName,
                description: record.category_description?.trim() || null,
                display_order: 0,
                is_active: true,
              });
              categoryId = newCategory.id;
              result.imported.categories++;
            }
            categoryMap.set(categoryName, categoryId);
          }

          // Process item
          const itemName = record.item_name?.trim();
          if (!itemName) {
            result.errors.push(
              `Row ${records.indexOf(record) + 1}: Item name is required`,
            );
            continue;
          }

          const itemKey = `${categoryId}-${itemName}`;
          let itemId = itemMap.get(itemKey);

          if (!itemId) {
            const itemPrice = parseFloat(record.item_price);
            if (isNaN(itemPrice) || itemPrice < 0) {
              result.errors.push(
                `Row ${records.indexOf(record) + 1}: Invalid item price`,
              );
              continue;
            }

            const isAvailable =
              record.item_is_available?.toLowerCase() === 'true';

            // Create new item
            const newItem = await this.itemsService.create({
              category_id: categoryId,
              name: itemName,
              description: record.item_description?.trim() || null,
              price: itemPrice.toString(),
              dietary_tags: record.item_dietary_tags
                ? record.item_dietary_tags.split(';').map((t) => t.trim())
                : [],
              is_available: isAvailable,
              display_order: 0,
            });
            itemId = newItem.id;
            result.imported.items++;
            itemMap.set(itemKey, itemId);
          }

          // Process modifier if present
          const modifierGroupName = record.modifier_group_name?.trim();
          const modifierOptionName = record.modifier_option_name?.trim();

          if (modifierGroupName && modifierOptionName) {
            const groupKey = `${itemId}-${modifierGroupName}`;
            let groupId = modifierGroupMap.get(groupKey);

            if (!groupId) {
              // Create modifier group
              const groupType = record.modifier_group_type?.trim() || 'single';
              const newGroup = await this.modifiersService.createGroup({
                menu_item_id: itemId,
                name: modifierGroupName,
                type: groupType as 'single' | 'multiple',
                is_required: false,
                display_order: 0,
              });
              groupId = newGroup.id;
              modifierGroupMap.set(groupKey, groupId);
            }

            // Create modifier option
            const priceAdjustment = parseFloat(
              record.modifier_option_price_adjustment || '0',
            );
            if (isNaN(priceAdjustment)) {
              result.errors.push(
                `Row ${records.indexOf(record) + 1}: Invalid modifier price adjustment`,
              );
              continue;
            }

            const optionIsAvailable =
              record.modifier_option_is_available?.toLowerCase() !== 'false';

            await this.modifiersService.createOption({
              modifier_group_id: groupId,
              name: modifierOptionName,
              price_adjustment: priceAdjustment.toString(),
              display_order: 0,
              is_available: optionIsAvailable,
            });
            result.imported.modifiers++;
          }
        } catch (error) {
          result.errors.push(
            `Row ${records.indexOf(record) + 1}: ${error.message}`,
          );
        }
      }

      return result;
    } catch (error) {
      throw new BadRequestException(`Failed to process CSV: ${error.message}`);
    }
  }
}
