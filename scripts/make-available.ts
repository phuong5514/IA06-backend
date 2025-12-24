import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { menuItems } from '../src/db/schema';

async function makeItemsAvailable() {
  const db = drizzle(process.env.DATABASE_URL);

  console.log('Making all menu items available...');

  const result = await db
    .update(menuItems)
    .set({ is_available: true })
    .returning();

  console.log('Updated items:', result.length);
}

makeItemsAvailable().catch(console.error);