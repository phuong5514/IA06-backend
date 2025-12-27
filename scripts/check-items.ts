import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, and, isNull } from 'drizzle-orm';
import { menuItems } from '../src/db/schema';

async function checkItems() {
  const db = drizzle(process.env.DATABASE_URL);

  console.log('Checking menu items in database...');

  // Get all items
  const allItems = await db.select().from(menuItems).execute();
  console.log('All items:', allItems.length);
  console.log('First few items:', allItems.slice(0, 3).map(item => ({ id: item.id, name: item.name, status: item.status, deleted_at: item.deleted_at })));

  // Get not deleted items
  const notDeletedItems = await db
    .select()
    .from(menuItems)
    .where(isNull(menuItems.deleted_at))
    .execute();
  console.log('Not deleted items:', notDeletedItems.length);

  // Get available items
  const availableItems = await db
    .select()
    .from(menuItems)
    .where(and(isNull(menuItems.deleted_at), eq(menuItems.status, 'available')))
    .execute();
  console.log('Available items:', availableItems.length);
}

checkItems().catch(console.error);