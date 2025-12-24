import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { menuItems } from '../src/db/schema';

async function undeleteItems() {
  const db = drizzle(process.env.DATABASE_URL);

  console.log('Undeleting all menu items...');

  const result = await db
    .update(menuItems)
    .set({ deleted_at: null })
    .returning();

  console.log('Updated items:', result.length);
}

undeleteItems().catch(console.error);