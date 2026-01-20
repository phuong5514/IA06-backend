import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, asc, desc, sql, isNull, like } from 'drizzle-orm';
import {
  menuItems,
  menuItemImages,
  MenuItem,
  NewMenuItem,
  MenuItemImage,
} from '../db/schema';
import { ModifiersService } from './modifiers.service';
import { getDrizzleDb } from '../infrastructure/drizzle.provider';

type NewMenuItemImageInput = Omit<
  MenuItemImage,
  'id' | 'menu_item_id' | 'created_at' | 'is_thumbnail' | 'display_order'
>;

@Injectable()
export class ItemsService {
  private db;

  constructor(private readonly modifiersService: ModifiersService) {
    this.db = getDrizzleDb();
  }

  async findAll(
    categoryId?: number,
    availableOnly: boolean = true,
    name?: string,
    sortBy?: string,
    sortOrder?: string,
    page: number = 1,
    limit: number = 50,
  ): Promise<{ items: MenuItem[]; total: number; page: number; limit: number }> {
    const offset = (page - 1) * limit;

    // Build where conditions
    const whereConditions = [isNull(menuItems.deleted_at)];

    if (availableOnly) {
      whereConditions.push(eq(menuItems.status, 'available'));
    }

    if (categoryId) {
      whereConditions.push(eq(menuItems.category_id, categoryId));
    }

    if (name) {
      whereConditions.push(like(menuItems.name, `%${name}%`));
    }

    // Build order by
    let orderBy;
    if (sortBy) {
      const isDesc = sortOrder === 'desc';
      switch (sortBy) {
        case 'name':
          orderBy = isDesc ? desc(menuItems.name) : asc(menuItems.name);
          break;
        case 'price':
          orderBy = isDesc ? desc(menuItems.price) : asc(menuItems.price);
          break;
        case 'created_at':
          orderBy = isDesc ? desc(menuItems.created_at) : asc(menuItems.created_at);
          break;
        case 'display_order':
        default:
          orderBy = asc(menuItems.display_order);
          break;
      }
    } else {
      orderBy = asc(menuItems.display_order);
    }

    // Get total count
    const totalResult = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(menuItems)
      .where(and(...whereConditions))
      .execute();

    const total = totalResult[0]?.count || 0;

    // Get paginated items
    const items = await this.db
      .select()
      .from(menuItems)
      .where(and(...whereConditions))
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset)
      .execute();

    return { items, total, page, limit };
  }

  async create(data: NewMenuItem): Promise<MenuItem> {
    const [item] = await this.db.insert(menuItems).values(data).returning();

    return item;
  }

  async findOne(id: number): Promise<MenuItem & { images?: MenuItemImage[]; modifiers?: any[] }> {
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

    // Get associated modifiers
    const modifiers = await this.modifiersService.findGroupsByItem(id);

    return { ...item, images, modifiers };
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

    // Check if this is the first image for this item
    const existingImages = await this.db
      .select()
      .from(menuItemImages)
      .where(eq(menuItemImages.menu_item_id, menuItemId))
      .execute();

    const isFirstImage = existingImages.length === 0;
    
    // Get the next display order
    const maxOrder = existingImages.length > 0 
      ? Math.max(...existingImages.map(img => img.display_order || 0))
      : -1;

    const [image] = await this.db
      .insert(menuItemImages)
      .values({ 
        ...imageData, 
        menu_item_id: menuItemId,
        is_thumbnail: isFirstImage, // First image is automatically the thumbnail
        display_order: maxOrder + 1,
      })
      .returning();

    // If this is the first image, update the menu item's image_url
    if (isFirstImage) {
      await this.updateMenuItemThumbnail(menuItemId, image.display_url);
    }

    return image;
  }

  async getImages(menuItemId: number): Promise<MenuItemImage[]> {
    const images = await this.db
      .select()
      .from(menuItemImages)
      .where(eq(menuItemImages.menu_item_id, menuItemId))
      .orderBy(desc(menuItemImages.is_thumbnail), asc(menuItemImages.display_order))
      .execute();

    return images;
  }

  async deleteImage(imageId: number): Promise<void> {
    // Get the image first to know which menu item it belongs to
    const [image] = await this.db
      .select()
      .from(menuItemImages)
      .where(eq(menuItemImages.id, imageId))
      .execute();

    if (!image) {
      throw new NotFoundException('Image not found');
    }

    const wasThumbnail = image.is_thumbnail;
    const menuItemId = image.menu_item_id;

    // Delete the image
    await this.db
      .delete(menuItemImages)
      .where(eq(menuItemImages.id, imageId))
      .execute();

    // If this was the thumbnail, set another image as thumbnail
    if (wasThumbnail) {
      const remainingImages = await this.db
        .select()
        .from(menuItemImages)
        .where(eq(menuItemImages.menu_item_id, menuItemId))
        .orderBy(asc(menuItemImages.display_order))
        .execute();

      if (remainingImages.length > 0) {
        // Set the first remaining image as thumbnail
        await this.setThumbnail(menuItemId, remainingImages[0].id);
      } else {
        // No images left, clear the menu item's image_url
        await this.db
          .update(menuItems)
          .set({ image_url: null, updated_at: sql`now()` })
          .where(eq(menuItems.id, menuItemId))
          .execute();
      }
    }
  }

  async setThumbnail(menuItemId: number, imageId: number): Promise<void> {
    // Verify the image belongs to this menu item
    const [image] = await this.db
      .select()
      .from(menuItemImages)
      .where(
        and(
          eq(menuItemImages.id, imageId),
          eq(menuItemImages.menu_item_id, menuItemId),
        ),
      )
      .execute();

    if (!image) {
      throw new NotFoundException('Image not found or does not belong to this menu item');
    }

    // Remove thumbnail flag from all images of this item
    await this.db
      .update(menuItemImages)
      .set({ is_thumbnail: false })
      .where(eq(menuItemImages.menu_item_id, menuItemId))
      .execute();

    // Set the new thumbnail
    await this.db
      .update(menuItemImages)
      .set({ is_thumbnail: true })
      .where(eq(menuItemImages.id, imageId))
      .execute();

    // Update menu item's image_url
    await this.updateMenuItemThumbnail(menuItemId, image.display_url);
  }

  private async updateMenuItemThumbnail(menuItemId: number, imageUrl: string): Promise<void> {
    await this.db
      .update(menuItems)
      .set({ image_url: imageUrl, updated_at: sql`now()` })
      .where(eq(menuItems.id, menuItemId))
      .execute();
  }
}
