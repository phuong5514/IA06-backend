import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, and, isNull } from 'drizzle-orm';
import { menuItems } from '../src/db/schema';

async function checkItem() {
  const db = drizzle(process.env.DATABASE_URL);

  console.log('Checking item with id 8...');

  const [item] = await db
    .select()
    .from(menuItems)
    .where(and(eq(menuItems.id, 8), isNull(menuItems.deleted_at)))
    .execute();

  console.log('Item:', item);
}

checkItem().catch(console.error);