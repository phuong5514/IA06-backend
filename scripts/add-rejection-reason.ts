#!/usr/bin/env node
/**
 * Migration Script: Add rejection_reason column only
 * Simpler migration that just adds the missing column
 */

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

async function runMigration() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  console.log('🔄 Connecting to database...');
  const client = postgres(dbUrl);
  const db = drizzle(client);

  try {
    console.log('🚀 Adding rejection_reason column...');
    
    await db.execute(sql`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
    `);

    console.log('✅ Migration completed successfully!');
    console.log('\n📊 Summary:');
    console.log('  - Added rejection_reason column to orders table');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
