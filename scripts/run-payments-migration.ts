import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;

async function runMigration() {
  console.log('Running payments migration...');
  console.log('Using database:', process.env.DATABASE_URL?.split('@')[1]?.split('/')[0]);
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    // Create payment_status enum
    console.log('Creating payment_status enum...');
    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    // Create payment_method enum
    console.log('Creating payment_method enum...');
    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE payment_method AS ENUM ('cash', 'stripe', 'card');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    // Create payments table
    console.log('Creating payments table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        table_id INTEGER REFERENCES tables(id) ON DELETE SET NULL,
        total_amount DECIMAL(10, 2) NOT NULL,
        payment_method payment_method NOT NULL,
        payment_status payment_status NOT NULL DEFAULT 'pending',
        stripe_payment_intent_id TEXT,
        stripe_payment_method_id TEXT,
        paid_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    
    // Create payment_orders junction table
    console.log('Creating payment_orders table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payment_orders (
        id SERIAL PRIMARY KEY,
        payment_id INTEGER NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
        order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(payment_id, order_id)
      );
    `);
    
    // Create indexes
    console.log('Creating indexes...');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_payments_table_id ON payments(table_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_payment_orders_payment_id ON payment_orders(payment_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_payment_orders_order_id ON payment_orders(order_id);');
    
    console.log('✅ Payments migration completed successfully!');
    console.log('Created tables: payments, payment_orders');
    console.log('Created enums: payment_status, payment_method');
    console.log('Created indexes');
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
  
  process.exit(0);
}

runMigration().catch(console.error);
