import { Injectable, OnModuleInit } from '@nestjs/common';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '../db/schema';

@Injectable()
export class DatabaseService implements OnModuleInit {
  async onModuleInit() {
    if (process.env.NODE_ENV === 'production') {
      try {
        const client = postgres(process.env.DATABASE_URL!, { max: 1 });
        const db = drizzle(client, { schema });

        // Run migrations
        await migrate(db, { migrationsFolder: './drizzle' });
        console.log('Database migrations completed successfully');
      } catch (error) {
        console.error('Database migration failed:', error);
        // In production, you might want to throw or handle differently
      }
    }
  }
}