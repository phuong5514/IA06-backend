import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../db/schema';

// Create a singleton connection pool
let pool: Pool | null = null;
let db: ReturnType<typeof drizzle> | null = null;

/**
 * Get or create a shared database connection pool
 * This ensures we reuse connections across all services
 */
export function getDrizzleDb() {
  if (!db) {
    // Create connection pool with optimized settings
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20, // Maximum pool size
      idleTimeoutMillis: 30000, // Close idle connections after 30s
      connectionTimeoutMillis: 5000, // Fail fast if can't connect in 5s
    });

    // Initialize Drizzle with the pool
    db = drizzle(pool, { schema });

    console.log('✅ Database connection pool created');
  }

  return db;
}

/**
 * Close the database connection pool
 * Should be called during application shutdown
 */
export async function closeDrizzleDb() {
  if (pool) {
    await pool.end();
    pool = null;
    db = null;
    console.log('🔒 Database connection pool closed');
  }
}
