import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, and, asc, sql } from 'drizzle-orm';
import {
  menuCategories,
  MenuCategory,
  NewMenuCategory,
  menuItems,
} from '../db/schema';
import 'dotenv/config';

@Injectable()
export class CategoriesService {
  private db;

  constructor() {
    this.db = drizzle(process.env.DATABASE_URL);
  }

  async findAll(): Promise<MenuCategory[]> {
    return await this.db
      .select()
      .from(menuCategories)
      .where(eq(menuCategories.is_active, true))
      .orderBy(asc(menuCategories.display_order), asc(menuCategories.name))
      .execute();
  }

  async findOne(id: number): Promise<MenuCategory> {
    const [category] = await this.db
      .select()
      .from(menuCategories)
      .where(eq(menuCategories.id, id))
      .execute();

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }

  async create(data: NewMenuCategory): Promise<MenuCategory> {
    const [category] = await this.db
      .insert(menuCategories)
      .values(data)
      .returning();

    return category;
  }

  async update(
    id: number,
    data: Partial<NewMenuCategory>,
  ): Promise<MenuCategory> {
    const [category] = await this.db
      .update(menuCategories)
      .set({
        ...data,
        updated_at: sql`NOW()`,
      })
      .where(eq(menuCategories.id, id))
      .returning();

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }

  async delete(id: number): Promise<void> {
    // Check if category has any menu items
    const itemsCount = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(menuItems)
      .where(eq(menuItems.category_id, id));

    if (itemsCount[0].count > 0) {
      throw new ConflictException(
        `Cannot delete category with ID ${id} because it contains ${itemsCount[0].count} menu item(s). Please reassign or delete the items first.`,
      );
    }

    const result = await this.db
      .delete(menuCategories)
      .where(eq(menuCategories.id, id));

    if (result.rowCount === 0) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }
  }

  async reorderCategories(categoryIds: number[]): Promise<void> {
    // Update display_order for each category
    const updates = categoryIds.map((id, index) =>
      this.db
        .update(menuCategories)
        .set({
          display_order: index,
          updated_at: sql`NOW()`,
        })
        .where(eq(menuCategories.id, id)),
    );

    await Promise.all(updates);
  }
}
