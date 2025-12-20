import { pgTable, uuid, varchar, timestamp, boolean, text } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const usersTable = pgTable("users", {
  id: uuid("id").default(sql`gen_random_uuid()`).primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password").notNull(),
  role: varchar("role", { length: 50 }).notNull().default('customer'),
  is_active: boolean("is_active").notNull().default(true),
  created_at: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
});

export const refreshTokensTable = pgTable("refresh_tokens", {
  id: uuid("id").default(sql`gen_random_uuid()`).primaryKey(),
  user_id: uuid("user_id").notNull().references(() => usersTable.id),
  token_hash: text("token_hash").notNull().unique(),
  jti: varchar("jti", { length: 255 }).notNull(),
  created_at: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
  last_used_at: timestamp("last_used_at", { withTimezone: true }).default(sql`now()`),
  expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
  revoked: boolean("revoked").default(false),
  device_info: text("device_info"),
  issued_by_ip: text("issued_by_ip"),
});