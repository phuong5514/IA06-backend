import { integer, pgTable, varchar, date, timestamp, boolean, text } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const usersTable = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  email: varchar({ length: 255 }).notNull().unique(),
  password: varchar({ length: 255 }).notNull(),
  createdAt: date().default(sql`CURRENT_DATE`)
});

export const refreshTokensTable = pgTable("refresh_tokens", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  tokenHash: text("token_hash").notNull().unique(),
  jti: varchar({ length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).default(sql`now()`),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }).default(sql`now()`),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revoked: boolean().default(false),
  deviceInfo: text("device_info"),
  issuedByIp: text("issued_by_ip")
});