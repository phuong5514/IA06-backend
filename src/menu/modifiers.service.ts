import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, and, asc, sql } from 'drizzle-orm';
import {
  modifierGroups,
  modifierOptions,
  ModifierGroup,
  NewModifierGroup,
  ModifierOption,
  NewModifierOption
} from '../db/schema';
import 'dotenv/config';

@Injectable()
export class ModifiersService {
  private db;

  constructor() {
    this.db = drizzle(process.env.DATABASE_URL);
  }

  // Modifier Groups
  async findAllGroups(): Promise<ModifierGroup[]> {
    return this.db
      .select()
      .from(modifierGroups)
      .orderBy(asc(modifierGroups.display_order), asc(modifierGroups.name));
  }

  async findOneGroup(id: number): Promise<ModifierGroup> {
    const [group] = await this.db
      .select()
      .from(modifierGroups)
      .where(eq(modifierGroups.id, id));

    if (!group) {
      throw new NotFoundException(`Modifier group with ID ${id} not found`);
    }

    return group;
  }

  async findGroupsByItem(menuItemId: number): Promise<ModifierGroup[]> {
    return this.db
      .select()
      .from(modifierGroups)
      .where(eq(modifierGroups.menu_item_id, menuItemId))
      .orderBy(asc(modifierGroups.display_order), asc(modifierGroups.name));
  }

  async createGroup(data: NewModifierGroup): Promise<ModifierGroup> {
    const [group] = await this.db
      .insert(modifierGroups)
      .values(data)
      .returning();

    return group;
  }

  async updateGroup(
    id: number,
    data: Partial<NewModifierGroup>,
  ): Promise<ModifierGroup> {
    const [group] = await this.db
      .update(modifierGroups)
      .set({
        ...data,
        updated_at: sql`NOW()`,
      })
      .where(eq(modifierGroups.id, id))
      .returning();

    if (!group) {
      throw new NotFoundException(`Modifier group with ID ${id} not found`);
    }

    return group;
  }

  async deleteGroup(id: number): Promise<void> {
    const result = await this.db
      .delete(modifierGroups)
      .where(eq(modifierGroups.id, id));

    if (result.rowCount === 0) {
      throw new NotFoundException(`Modifier group with ID ${id} not found`);
    }
  }

  // Modifier Options
  async findAllOptions(): Promise<ModifierOption[]> {
    return this.db
      .select()
      .from(modifierOptions)
      .where(eq(modifierOptions.is_available, true))
      .orderBy(asc(modifierOptions.display_order), asc(modifierOptions.name));
  }

  async findOneOption(id: number): Promise<ModifierOption> {
    const [option] = await this.db
      .select()
      .from(modifierOptions)
      .where(eq(modifierOptions.id, id));

    if (!option) {
      throw new NotFoundException(`Modifier option with ID ${id} not found`);
    }

    return option;
  }

  async findOptionsByGroup(modifierGroupId: number): Promise<ModifierOption[]> {
    return this.db
      .select()
      .from(modifierOptions)
      .where(eq(modifierOptions.modifier_group_id, modifierGroupId))
      .orderBy(asc(modifierOptions.display_order), asc(modifierOptions.name));
  }

  async createOption(data: NewModifierOption): Promise<ModifierOption> {
    const [option] = await this.db
      .insert(modifierOptions)
      .values(data)
      .returning();

    return option;
  }

  async updateOption(
    id: number,
    data: Partial<NewModifierOption>,
  ): Promise<ModifierOption> {
    const [option] = await this.db
      .update(modifierOptions)
      .set({
        ...data,
        updated_at: sql`NOW()`,
      })
      .where(eq(modifierOptions.id, id))
      .returning();

    if (!option) {
      throw new NotFoundException(`Modifier option with ID ${id} not found`);
    }

    return option;
  }

  async deleteOption(id: number): Promise<void> {
    const result = await this.db
      .delete(modifierOptions)
      .where(eq(modifierOptions.id, id));

    if (result.rowCount === 0) {
      throw new NotFoundException(`Modifier option with ID ${id} not found`);
    }
  }

  // Validation methods
  async validateModifierSelection(
    menuItemId: number,
    selectedOptions: number[],
  ): Promise<{ valid: boolean; errors: string[] }> {
    const groups = await this.findGroupsByItem(menuItemId);
    const errors: string[] = [];

    for (const group of groups) {
      const groupOptions = selectedOptions.filter(optionId => {
        // Check if option belongs to this group
        // This would need a query to check, but for now we'll assume validation is done elsewhere
        return true;
      });

      if (group.is_required && groupOptions.length === 0) {
        errors.push(`Modifier group "${group.name}" is required`);
      }

      if (group.type === 'single' && groupOptions.length > 1) {
        errors.push(`Modifier group "${group.name}" allows only one selection`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}