import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, and, asc, desc, sql, isNull } from 'drizzle-orm';
import {
  menuItems,
  menuItemImages,
  MenuItem,
  NewMenuItem,
  MenuItemImage,
} from '../db/schema';
import 'dotenv/config';

type NewMenuItemImageInput = Omit<
  MenuItemImage,
  'id' | 'menu_item_id' | 'created_at'
>;

@Injectable()
export class ItemsService {
  private db;

  constructor() {
    this.db = drizzle(process.env.DATABASE_URL);
  }

  async findAll(
    categoryId?: number,
    availableOnly: boolean = true,
  ): Promise<MenuItem[]> {
    return await this.db
      .select()
      .from(menuItems)
      .where(
        and(
          isNull(menuItems.deleted_at),
          availableOnly ? eq(menuItems.status, 'available') : undefined,
          categoryId ? eq(menuItems.category_id, categoryId) : undefined,
        ),
      )
      .orderBy(asc(menuItems.display_order), asc(menuItems.name))
      .execute();
  }

  async create(data: NewMenuItem): Promise<MenuItem> {
    const [item] = await this.db.insert(menuItems).values(data).returning();

    return item;
  }

  async findOne(id: number): Promise<MenuItem & { images?: MenuItemImage[] }> {
    const [item] = await this.db
      .select()
      .from(menuItems)
      .where(and(eq(menuItems.id, id), isNull(menuItems.deleted_at)))
      .execute();

    if (!item) {
      throw new NotFoundException('Menu item not found');
    }

    // Get associated images
    const images = await this.db
      .select()
      .from(menuItemImages)
      .where(eq(menuItemImages.menu_item_id, id))
      .orderBy(desc(menuItemImages.created_at))
      .execute();

    return { ...item, images };
  }

  async update(id: number, data: Partial<NewMenuItem>): Promise<MenuItem> {
    const [item] = await this.db
      .update(menuItems)
      .set({ ...data, updated_at: sql`now()` })
      .where(and(eq(menuItems.id, id), isNull(menuItems.deleted_at)))
      .returning();

    if (!item) {
      throw new NotFoundException('Menu item not found');
    }

    return item;
  }

  async remove(id: number): Promise<void> {
    const result = await this.db
      .update(menuItems)
      .set({ deleted_at: sql`now()` })
      .where(and(eq(menuItems.id, id), isNull(menuItems.deleted_at)));

    if (result.rowCount === 0) {
      throw new NotFoundException('Menu item not found');
    }
  }

  async addImage(
    menuItemId: number,
    imageData: NewMenuItemImageInput,
  ): Promise<MenuItemImage> {
    // Verify menu item exists
    const [item] = await this.db
      .select()
      .from(menuItems)
      .where(and(eq(menuItems.id, menuItemId), isNull(menuItems.deleted_at)))
      .execute();

    if (!item) {
      throw new NotFoundException('Menu item not found');
    }

    const [image] = await this.db
      .insert(menuItemImages)
      .values({ ...imageData, menu_item_id: menuItemId })
      .returning();

    // Update the menu item's image_url to point to the display image
    await this.db
      .update(menuItems)
      .set({ image_url: image.display_url, updated_at: sql`now()` })
      .where(eq(menuItems.id, menuItemId));

    return image;
  }
}
