#!/usr/bin/env node
/**
 * Migration Script: Update Order Status Enum
 * Adds new order statuses and rejection_reason field
 */

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

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
    console.log('📝 Reading migration file...');
    const migrationPath = path.join(__dirname, '..', 'db', 'migrations', '003_update_order_status_enum.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('🚀 Running migration...');
    
    // Remove comments and split by DO blocks and regular statements
    const lines = migrationSQL.split('\n');
    const cleanLines = lines.filter(line => {
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith('--');
    });
    
    const cleanSQL = cleanLines.join('\n');
    
    // Execute the entire migration as one transaction
    console.log('  Executing migration...');
    await db.execute(sql.raw(cleanSQL));

    console.log('✅ Migration completed successfully!');
    console.log('\n📊 Summary:');
    console.log('  - Added rejection_reason column to orders table');
    console.log('  - Added order statuses: accepted, rejected, served, completed');
    console.log('  - Migrated existing data: confirmed → accepted, delivered → served');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
