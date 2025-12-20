import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { Parser } from 'json2csv';
import { ItemsService } from './items.service';
import { CategoriesService } from './categories.service';
import { ModifiersService } from './modifiers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/roles.guard';

@Controller('menu/export')
export class ExportController {
  constructor(
    private readonly itemsService: ItemsService,
    private readonly categoriesService: CategoriesService,
    private readonly modifiersService: ModifiersService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  async exportMenu(@Res() res: Response) {
    // Fetch all data
    const categories = await this.categoriesService.findAll();
    const items = await this.itemsService.findAll(undefined, false); // Include unavailable items
    const modifiers = await this.modifiersService.findAllModifiers();

    // Prepare CSV data
    const csvData = [];

    for (const category of categories) {
      const categoryItems = items.filter(
        (item) => item.category_id === category.id,
      );

      for (const item of categoryItems) {
        const itemModifiers = modifiers.filter(
          (mod) => mod.menu_item_id === item.id,
        );

        // Base item row
        const baseRow = {
          category_name: category.name,
          category_description: category.description || '',
          item_name: item.name,
          item_description: item.description || '',
          item_price: item.price,
          item_image_url: item.image_url || '',
          item_dietary_tags: (item.dietary_tags || []).join(';'),
          item_is_available: item.is_available,
          modifier_group_name: '',
          modifier_group_type: '',
          modifier_option_name: '',
          modifier_option_price_adjustment: '',
          modifier_option_is_available: '',
        };

        if (itemModifiers.length === 0) {
          // No modifiers, just add the item
          csvData.push(baseRow);
        } else {
          // Add rows for each modifier option
          for (const modifier of itemModifiers) {
            csvData.push({
              ...baseRow,
              modifier_group_name: modifier.group_name,
              modifier_group_type: modifier.group_type,
              modifier_option_name: modifier.option_name,
              modifier_option_price_adjustment: modifier.price_adjustment,
              modifier_option_is_available: modifier.is_available,
            });
          }
        }
      }
    }

    // Convert to CSV
    const fields = [
      'category_name',
      'category_description',
      'item_name',
      'item_description',
      'item_price',
      'item_image_url',
      'item_dietary_tags',
      'item_is_available',
      'modifier_group_name',
      'modifier_group_type',
      'modifier_option_name',
      'modifier_option_price_adjustment',
      'modifier_option_is_available',
    ];

    const opts = { fields };
    const parser = new Parser(opts);
    const csv = parser.parse(csvData);

    // Set response headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="menu_export.csv"',
    );
    res.send(csv);
  }
}
