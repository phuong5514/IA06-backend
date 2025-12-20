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

export const users = pgTable('users', {
  id: uuid('id')
    .default(sql`gen_random_uuid()`)
    .primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  password: varchar('password', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull().default('customer'),
  name: varchar('name', { length: 200 }),
  phone: varchar('phone', { length: 20 }),
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
  is_active: boolean('is_active').notNull().default(true),
  qr_token: text('qr_token'),
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
  category_id: integer('category_id').notNull().references(() => menuCategories.id, { onDelete: 'restrict' }),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  image_url: varchar('image_url', { length: 500 }),
  dietary_tags: text('dietary_tags').array(),
  is_available: boolean('is_available').default(true).notNull(),
  display_order: integer('display_order').default(0).notNull(),
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
  menu_item_id: integer('menu_item_id').notNull().references(() => menuItems.id, { onDelete: 'cascade' }),
  original_url: varchar('original_url', { length: 500 }).notNull(),
  thumbnail_url: varchar('thumbnail_url', { length: 500 }).notNull(),
  display_url: varchar('display_url', { length: 500 }).notNull(),
  file_size: integer('file_size').notNull(),
  format: varchar('format', { length: 10 }).notNull(),
  created_at: timestamp('created_at', { mode: 'string' })
    .defaultNow()
    .notNull(),
});

export type MenuItemImage = typeof menuItemImages.$inferSelect;
export type NewMenuItemImage = typeof menuItemImages.$inferInsert;
