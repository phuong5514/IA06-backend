import {
  pgTable,
  serial,
  varchar,
  integer,
  boolean,
  timestamp,
  uuid,
  text,
  decimal,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const menuItemStatusEnum = pgEnum('menu_item_status', ['available', 'unavailable', 'sold_out']);

// Export payment-related schemas
export { payments, paymentOrders, paymentStatusEnum, paymentMethodEnum } from './payment-schema';
export type { Payment, NewPayment, PaymentOrder, NewPaymentOrder } from './payment-schema';

export const users = pgTable('users', {
  id: uuid('id')
    .default(sql`gen_random_uuid()`)
    .primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  password: varchar('password', { length: 255 }),
  role: varchar('role', { length: 50 }).notNull().default('customer'),
  name: varchar('name', { length: 200 }),
  phone: varchar('phone', { length: 20 }),
  profile_image_url: varchar('profile_image_url', { length: 500 }),
  stripe_customer_id: varchar('stripe_customer_id', { length: 255 }),
  oauth_provider: varchar('oauth_provider', { length: 50 }),
  oauth_id: varchar('oauth_id', { length: 255 }),
  is_active: boolean('is_active').default(true).notNull(),
  email_verified: boolean('email_verified').default(false).notNull(),
  last_login: timestamp('last_login', { mode: 'string' }),
  failed_login_attempts: integer('failed_login_attempts').default(0).notNull(),
  locked_until: timestamp('locked_until', { mode: 'string' }),
  deleted_at: timestamp('deleted_at', { mode: 'string' }),
  created_at: timestamp('created_at', { mode: 'string' })
    .defaultNow()
    .notNull(),
  updated_at: timestamp('updated_at', { mode: 'string' })
    .defaultNow()
    .notNull(),
});

export type Users = typeof users;

export const usersTable = users;

// export const usersTable = pgTable("users", {
//   id: uuid("id").default(sql`gen_random_uuid()`).primaryKey(),
//   email: varchar("email", { length: 255 }).notNull().unique(),
//   password: text("password").notNull(),
//   role: varchar("role", { length: 50 }).notNull().default('customer'),
//   is_active: boolean("is_active").notNull().default(true),
//   created_at: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
// });

export const refreshTokensTable = pgTable('refresh_tokens', {
  id: uuid('id')
    .default(sql`gen_random_uuid()`)
    .primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  tokenHash: text('token_hash').notNull().unique(),
  jti: varchar('jti', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).default(
    sql`now()`,
  ),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }).default(
    sql`now()`,
  ),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revoked: boolean('revoked').default(false),
  deviceInfo: text('device_info'),
  issuedByIp: text('issued_by_ip'),
});

// Email verification tokens
export const emailVerificationTokensTable = pgTable(
  'email_verification_tokens',
  {
    id: uuid('id')
      .default(sql`gen_random_uuid()`)
      .primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    token: varchar('token', { length: 255 }).notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    used: boolean('used').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .default(sql`now()`)
      .notNull(),
  },
);

// Password reset tokens
export const passwordResetTokensTable = pgTable('password_reset_tokens', {
  id: uuid('id')
    .default(sql`gen_random_uuid()`)
    .primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  used: boolean('used').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .default(sql`now()`)
    .notNull(),
});

// Tables
export const tables = pgTable('tables', {
  id: serial('id').primaryKey(),
  table_number: varchar('table_number', { length: 50 }).notNull().unique(),
  capacity: integer('capacity').notNull().default(4),
  location: varchar('location', { length: 200 }),
  description: text('description'),
  is_active: boolean('is_active').notNull().default(true),
  qr_token: text('qr_token'),
  short_code: varchar('short_code', { length: 8 }).unique(),
  qr_generated_at: timestamp('qr_generated_at', { mode: 'string' }),
  qr_expires_at: timestamp('qr_expires_at', { mode: 'string' }),
  created_at: timestamp('created_at', { mode: 'string' })
    .defaultNow()
    .notNull(),
  updated_at: timestamp('updated_at', { mode: 'string' })
    .defaultNow()
    .notNull(),
});

export type Table = typeof tables.$inferSelect;
export type NewTable = typeof tables.$inferInsert;

// Menu Categories
export const menuCategories = pgTable('menu_categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  display_order: integer('display_order').default(0).notNull(),
  is_active: boolean('is_active').default(true).notNull(),
  created_at: timestamp('created_at', { mode: 'string' })
    .defaultNow()
    .notNull(),
  updated_at: timestamp('updated_at', { mode: 'string' })
    .defaultNow()
    .notNull(),
});

export type MenuCategory = typeof menuCategories.$inferSelect;
export type NewMenuCategory = typeof menuCategories.$inferInsert;

// Menu Items
export const menuItems = pgTable('menu_items', {
  id: serial('id').primaryKey(),
  category_id: integer('category_id')
    .notNull()
    .references(() => menuCategories.id, { onDelete: 'restrict' }),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  image_url: text('image_url'),
  dietary_tags: text('dietary_tags').array(),
  status: menuItemStatusEnum('status').notNull().default('available'),
  display_order: integer('display_order').default(0).notNull(),
  preparation_time: integer('preparation_time'),
  chef_recommendation: boolean('chef_recommendation'),
  created_at: timestamp('created_at', { mode: 'string' })
    .defaultNow()
    .notNull(),
  updated_at: timestamp('updated_at', { mode: 'string' })
    .defaultNow()
    .notNull(),
  deleted_at: timestamp('deleted_at', { mode: 'string' }),
});

export type MenuItem = typeof menuItems.$inferSelect;
export type NewMenuItem = typeof menuItems.$inferInsert;

// Menu Item Images
export const menuItemImages = pgTable('menu_item_images', {
  id: serial('id').primaryKey(),
  menu_item_id: integer('menu_item_id')
    .notNull()
    .references(() => menuItems.id, { onDelete: 'cascade' }),
  original_url: text('original_url').notNull(),
  thumbnail_url: text('thumbnail_url').notNull(),
  display_url: text('display_url').notNull(),
  file_size: integer('file_size').notNull(),
  format: varchar('format', { length: 10 }).notNull(),
  is_thumbnail: boolean('is_thumbnail').default(false).notNull(),
  display_order: integer('display_order').default(0).notNull(),
  created_at: timestamp('created_at', { mode: 'string' })
    .defaultNow()
    .notNull(),
});

export type MenuItemImage = typeof menuItemImages.$inferSelect;
export type NewMenuItemImage = typeof menuItemImages.$inferInsert;

// Modifier Groups
export const modifierGroups = pgTable('modifier_groups', {
  id: serial('id').primaryKey(),
  menu_item_id: integer('menu_item_id')
    .notNull()
    .references(() => menuItems.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  type: varchar('type', { length: 20 }).notNull(), // 'single' or 'multiple'
  is_required: boolean('is_required').default(false).notNull(),
  display_order: integer('display_order').default(0).notNull(),
  created_at: timestamp('created_at', { mode: 'string' })
    .defaultNow()
    .notNull(),
  updated_at: timestamp('updated_at', { mode: 'string' })
    .defaultNow()
    .notNull(),
});

export type ModifierGroup = typeof modifierGroups.$inferSelect;
export type NewModifierGroup = typeof modifierGroups.$inferInsert;

// Modifier Options
export const modifierOptions = pgTable('modifier_options', {
  id: serial('id').primaryKey(),
  modifier_group_id: integer('modifier_group_id')
    .notNull()
    .references(() => modifierGroups.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  price_adjustment: decimal('price_adjustment', { precision: 10, scale: 2 })
    .default('0.00')
    .notNull(),
  display_order: integer('display_order').default(0).notNull(),
  is_available: boolean('is_available').default(true).notNull(),
  created_at: timestamp('created_at', { mode: 'string' })
    .defaultNow()
    .notNull(),
  updated_at: timestamp('updated_at', { mode: 'string' })
    .defaultNow()
    .notNull(),
});

export type ModifierOption = typeof modifierOptions.$inferSelect;
export type NewModifierOption = typeof modifierOptions.$inferInsert;

// Orders
export const orderStatusEnum = pgEnum('order_status', [
  'pending',
  'accepted',
  'rejected',
  'preparing',
  'ready',
  'served',
  'completed',
  'cancelled'
]);

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  user_id: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'restrict' }),
  table_id: integer('table_id')
    .references(() => tables.id, { onDelete: 'set null' }),
  status: orderStatusEnum('status').notNull().default('pending'),
  total_amount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  special_instructions: text('special_instructions'),
  rejection_reason: text('rejection_reason'),
  created_at: timestamp('created_at', { mode: 'string' })
    .defaultNow()
    .notNull(),
  updated_at: timestamp('updated_at', { mode: 'string' })
    .defaultNow()
    .notNull(),
});

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;

// Order Items
export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  order_id: integer('order_id')
    .notNull()
    .references(() => orders.id, { onDelete: 'cascade' }),
  menu_item_id: integer('menu_item_id')
    .notNull()
    .references(() => menuItems.id, { onDelete: 'restrict' }),
  quantity: integer('quantity').notNull().default(1),
  unit_price: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
  total_price: decimal('total_price', { precision: 10, scale: 2 }).notNull(),
  special_instructions: text('special_instructions'),
  created_at: timestamp('created_at', { mode: 'string' })
    .defaultNow()
    .notNull(),
});

export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;

// Order Item Modifiers
export const orderItemModifiers = pgTable('order_item_modifiers', {
  id: serial('id').primaryKey(),
  order_item_id: integer('order_item_id')
    .notNull()
    .references(() => orderItems.id, { onDelete: 'cascade' }),
  modifier_group_id: integer('modifier_group_id')
    .notNull()
    .references(() => modifierGroups.id, { onDelete: 'restrict' }),
  modifier_option_id: integer('modifier_option_id')
    .notNull()
    .references(() => modifierOptions.id, { onDelete: 'restrict' }),
  price_adjustment: decimal('price_adjustment', { precision: 10, scale: 2 }).notNull(),
});

export type OrderItemModifier = typeof orderItemModifiers.$inferSelect;
export type NewOrderItemModifier = typeof orderItemModifiers.$inferInsert;

// User Preferences
export const userPreferences = pgTable('user_preferences', {
  id: serial('id').primaryKey(),
  user_id: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .unique(),
  dietary_tags: text('dietary_tags').array().notNull().default(sql`'{}'`),
  created_at: timestamp('created_at', { mode: 'string' })
    .defaultNow()
    .notNull(),
  updated_at: timestamp('updated_at', { mode: 'string' })
    .defaultNow()
    .notNull(),
});

export type UserPreference = typeof userPreferences.$inferSelect;
export type NewUserPreference = typeof userPreferences.$inferInsert;

// Saved Payment Methods
export const savedPaymentMethods = pgTable('saved_payment_methods', {
  id: serial('id').primaryKey(),
  user_id: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  stripe_payment_method_id: text('stripe_payment_method_id').notNull(),
  card_brand: varchar('card_brand', { length: 50 }),
  last4: varchar('last4', { length: 4 }).notNull(),
  exp_month: integer('exp_month').notNull(),
  exp_year: integer('exp_year').notNull(),
  is_default: boolean('is_default').notNull().default(false),
  created_at: timestamp('created_at', { mode: 'string' })
    .defaultNow()
    .notNull(),
  updated_at: timestamp('updated_at', { mode: 'string' })
    .defaultNow()
    .notNull(),
});

export type SavedPaymentMethod = typeof savedPaymentMethods.$inferSelect;
export type NewSavedPaymentMethod = typeof savedPaymentMethods.$inferInsert;

// Audit Logs
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  user_id: uuid('user_id')
    .references(() => users.id, { onDelete: 'set null' }),
  user_email: varchar('user_email', { length: 255 }),
  user_role: varchar('user_role', { length: 50 }),
  action: varchar('action', { length: 100 }).notNull(), // e.g., 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT'
  resource_type: varchar('resource_type', { length: 100 }), // e.g., 'ORDER', 'MENU_ITEM', 'TABLE', 'USER'
  resource_id: varchar('resource_id', { length: 255 }), // ID of the affected resource
  description: text('description').notNull(),
  metadata: text('metadata'), // JSON string for additional data
  ip_address: varchar('ip_address', { length: 45 }),
  user_agent: text('user_agent'),
  created_at: timestamp('created_at', { mode: 'string' })
    .defaultNow()
    .notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

// System Settings
export const systemSettings = pgTable('system_settings', {
  id: serial('id').primaryKey(),
  key: varchar('key', { length: 100 }).notNull().unique(),
  value: text('value').notNull(),
  description: text('description'),
  category: varchar('category', { length: 50 }).notNull().default('general'), // 'general', 'branding', 'workflow', 'advanced'
  is_public: boolean('is_public').default(false).notNull(), // If true, can be accessed without auth
  updated_by: uuid('updated_by')
    .references(() => users.id, { onDelete: 'set null' }),
  created_at: timestamp('created_at', { mode: 'string' })
    .defaultNow()
    .notNull(),
  updated_at: timestamp('updated_at', { mode: 'string' })
    .defaultNow()
    .notNull(),
});

export type SystemSetting = typeof systemSettings.$inferSelect;
export type NewSystemSetting = typeof systemSettings.$inferInsert;

// Menu Item Reviews
export const menuItemReviews = pgTable('menu_item_reviews', {
  id: serial('id').primaryKey(),
  menu_item_id: integer('menu_item_id')
    .notNull()
    .references(() => menuItems.id, { onDelete: 'cascade' }),
  user_id: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  rating: integer('rating').notNull(), // 1-5 stars
  comment: text('comment'),
  admin_response: text('admin_response'),
  admin_responded_at: timestamp('admin_responded_at', { mode: 'string' }),
  admin_responded_by: uuid('admin_responded_by')
    .references(() => users.id, { onDelete: 'set null' }),
  created_at: timestamp('created_at', { mode: 'string' })
    .defaultNow()
    .notNull(),
  updated_at: timestamp('updated_at', { mode: 'string' })
    .defaultNow()
    .notNull(),
});

export type MenuItemReview = typeof menuItemReviews.$inferSelect;
export type NewMenuItemReview = typeof menuItemReviews.$inferInsert;
