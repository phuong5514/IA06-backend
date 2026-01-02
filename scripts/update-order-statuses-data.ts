#!/usr/bin/env node
/**
 * Data Migration: Update existing order statuses to match new enum
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
    console.log('📊 Checking current order statuses...');
    
    const statusCheck: any = await db.execute(sql`
      SELECT status, COUNT(*) as count 
      FROM orders 
      GROUP BY status;
    `);
    
    console.log('Current statuses:', statusCheck);
    
    // Check if there are any orders with old statuses  
    const rows = Array.isArray(statusCheck) ? statusCheck : (statusCheck.rows || []);
    const hasDelivered = rows.some((r: any) => r.status === 'delivered');
    const hasConfirmed = rows.some((r: any) => r.status === 'confirmed');
    
    if (hasDelivered || hasConfirmed) {
      console.log('\n🔄 Updating old status values...');
      
      if (hasConfirmed) {
        const result = await db.execute(sql`
          UPDATE orders 
          SET status = 'accepted'::text 
          WHERE status::text = 'confirmed';
        `);
        console.log(`  ✓ Updated ${result.count} orders from 'confirmed' to 'accepted'`);
      }
      
      if (hasDelivered) {
        const result = await db.execute(sql`
          UPDATE orders 
          SET status = 'served'::text 
          WHERE status::text = 'delivered';
        `);
        console.log(`  ✓ Updated ${result.count} orders from 'delivered' to 'served'`);
      }
    } else {
      console.log('✅ No old status values found to update');
    }
    
    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
