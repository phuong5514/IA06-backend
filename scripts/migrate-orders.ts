import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { readFileSync } from 'fs';
import { join } from 'path';

async function migrate() {
  console.log('Applying orders migration...');
  
  const db = drizzle(process.env.DATABASE_URL!);
  
  try {
    const migrationSQL = readFileSync(
      join(__dirname, '../drizzle/0003_orders_tables.sql'),
      'utf-8'
    );
    
    // Execute the migration
    await db.execute(migrationSQL as any);
    
    console.log('✓ Orders migration applied successfully!');
  } catch (error) {
    console.error('Error applying migration:', error);
    throw error;
  }
  
  process.exit(0);
}

migrate();
