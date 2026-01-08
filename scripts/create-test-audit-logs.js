// Script to create test audit log entries
require('dotenv').config();
const { drizzle } = require('drizzle-orm/node-postgres');
const { pgTable, serial, varchar, text, timestamp, boolean, uuid } = require('drizzle-orm/pg-core');

// Define schema inline
const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  user_id: uuid('user_id'),
  user_email: varchar('user_email', { length: 255 }),
  user_role: varchar('user_role', { length: 50 }),
  action: varchar('action', { length: 100 }).notNull(),
  resource_type: varchar('resource_type', { length: 100 }),
  resource_id: varchar('resource_id', { length: 255 }),
  description: text('description').notNull(),
  metadata: text('metadata'),
  ip_address: varchar('ip_address', { length: 45 }),
  user_agent: text('user_agent'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

const db = drizzle(process.env.DATABASE_URL);

async function createTestAuditLogs() {
  console.log('Creating test audit log entries...');

  const testLogs = [
    {
      user_id: null,
      user_email: 'admin@test.com',
      user_role: 'admin',
      action: 'CREATE',
      resource_type: 'MENU_ITEM',
      resource_id: '123',
      description: 'Admin created a new menu item',
      metadata: JSON.stringify({ itemName: 'Test Pizza', price: 15.99 }),
      ip_address: '127.0.0.1',
      user_agent: 'Mozilla/5.0',
    },
    {
      user_id: null,
      user_email: 'admin@test.com',
      user_role: 'admin',
      action: 'UPDATE',
      resource_type: 'ORDER',
      resource_id: '456',
      description: 'Admin updated order status',
      metadata: JSON.stringify({ oldStatus: 'pending', newStatus: 'preparing' }),
      ip_address: '127.0.0.1',
      user_agent: 'Mozilla/5.0',
    },
    {
      user_id: null,
      user_email: 'waiter@test.com',
      user_role: 'waiter',
      action: 'VIEW',
      resource_type: 'TABLES',
      resource_id: null,
      description: 'Waiter viewed tables list',
      metadata: JSON.stringify({ count: 10 }),
      ip_address: '127.0.0.1',
      user_agent: 'Mozilla/5.0',
    },
    {
      user_id: null,
      user_email: 'kitchen@test.com',
      user_role: 'kitchen',
      action: 'UPDATE',
      resource_type: 'ORDER',
      resource_id: '789',
      description: 'Kitchen staff marked order as ready',
      metadata: JSON.stringify({ orderId: 789, action: 'mark_ready' }),
      ip_address: '127.0.0.1',
      user_agent: 'Mozilla/5.0',
    },
    {
      user_id: null,
      user_email: 'admin@test.com',
      user_role: 'super_admin',
      action: 'DELETE',
      resource_type: 'MENU_ITEM',
      resource_id: '999',
      description: 'Super admin deleted menu item',
      metadata: JSON.stringify({ itemName: 'Old Item', reason: 'No longer available' }),
      ip_address: '127.0.0.1',
      user_agent: 'Mozilla/5.0',
    },
  ];

  try {
    for (const log of testLogs) {
      await db.insert(auditLogs).values(log);
      console.log(`✅ Created log: ${log.description}`);
    }

    console.log('\n✅ All test audit logs created successfully!');
    console.log('You can now refresh the audit logs page to see the data.');
    
    // Verify count
    const result = await db.select().from(auditLogs);
    console.log(`\nTotal audit logs in database: ${result.length}`);
  } catch (error) {
    console.error('❌ Error creating audit logs:', error.message);
  }
  
  process.exit(0);
}

createTestAuditLogs();
