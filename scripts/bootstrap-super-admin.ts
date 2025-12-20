#!/usr/bin/env node

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import { users } from '../src/db/schema';

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;

  if (!superAdminEmail || !superAdminPassword) {
    console.error('SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD environment variables are required');
    process.exit(1);
  }

  const client = postgres(dbUrl);
  const db = drizzle(client, { schema: { users } });

  try {
    // Check if super admin already exists
    const existingSuperAdmin = await db
      .select()
      .from(users)
      .where(eq(users.role, 'super_admin'))
      .limit(1);

    if (existingSuperAdmin.length > 0) {
      if (process.env.NODE_ENV === 'production') {
        console.error('Super admin already exists. Bootstrap script cannot run in production.');
        process.exit(1);
      } else {
        console.log('Super admin already exists. Skipping creation.');
        return;
      }
    }

    // Hash the password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(superAdminPassword, saltRounds);

    // Create super admin
    await db.insert(users).values({
      email: superAdminEmail,
      password: passwordHash,
      role: 'super_admin',
      name: 'Super Admin',
      is_active: true,
      email_verified: true,
    });

    console.log('Super admin account created successfully.');
  } catch (error) {
    console.error('Error creating super admin:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();