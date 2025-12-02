import { integer, pgTable, varchar, date } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const usersTable = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  email: varchar({ length: 255 }).notNull().unique(),
  password: varchar({length: 255}).notNull(),
  createdAt: date().default(sql`CURRENT_DATE`)
});


//Create a User schema with the following fields:
// email (String, required, unique)
// password (String, required)
// createdAt (Date, default to current date)