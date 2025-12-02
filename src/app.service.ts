import { Injectable } from '@nestjs/common';
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { usersTable } from './db/schema';
import * as bcrypt from 'bcrypt';
  
@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }
}

@Injectable()
export class UserService {
  private db;

  constructor() {
    this.db = drizzle(process.env.DATABASE_URL);
  }

  async registerUser(email: string, password: string): Promise<{ success: boolean; message: string }> {
    try {
      // Check if email already exists
      const existingUsers = await this.db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, email));
      
      if (existingUsers.length > 0) {
        return { success: false, message: `user ${email} already exists` };
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser: typeof usersTable.$inferInsert = {
        email: email,
        password: hashedPassword,
      }

      await this.db.insert(usersTable).values(newUser);
      return { success: true, message: `user ${email} registered successfully` };
    } catch(error) {
      return { success: false, message: `user ${email} failed to registered, reason: ${error}` };
    }

  }

  async login(email: string, password: string): Promise<{ success: boolean; message: string }> {
    try {
      const users = await this.db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, email));
      
      if (users.length === 0) {
        return { success: false, message: 'User not found' };
      }

      const user = users[0];
      
      // Compare hashed passwords using bcrypt
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (isPasswordValid) {
        return { success: true, message: 'Login successful' };
      } else {
        return { success: false, message: 'Invalid password' };
      }
    } catch (error) {
      return { success: false, message: `Login failed: ${error}` };
    }
  }

}