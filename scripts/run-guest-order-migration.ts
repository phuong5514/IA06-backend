import 'dotenv/config';
import postgres from 'postgres';
import { readFileSync } from 'fs';
import { join } from 'path';

async function runMigration() {
  const sql = postgres(process.env.DATABASE_URL!);
  
  try {
    console.log('Running migration: Make user_id nullable for guest orders...');
    
    // Execute the migration SQL directly
    console.log('Step 1: Dropping NOT NULL constraint from user_id...');
    await sql`ALTER TABLE orders ALTER COLUMN user_id DROP NOT NULL`;
    
    console.log('Step 2: Adding check constraint to ensure user_id or session_id...');
    await sql`
      ALTER TABLE orders ADD CONSTRAINT orders_user_or_session_check 
      CHECK (user_id IS NOT NULL OR session_id IS NOT NULL)
    `;
    
    console.log('✅ Migration completed successfully!');
  } catch (error: any) {
    if (error.message && error.message.includes('already exists')) {
      console.log('⚠️  Constraint already exists, skipping...');
    } else {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }
  } finally {
    await sql.end();
  }
}

runMigration();
