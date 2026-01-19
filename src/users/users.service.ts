import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import { users } from '../db/schema';
import { CreateStaffDto, UpdateStaffDto } from './dto/create-staff.dto';
import { getDrizzleDb } from '../infrastructure/drizzle.provider';

@Injectable()
export class UsersService {
  private readonly BCRYPT_ROUNDS = 12;
  private db;

  constructor() {
    this.db = getDrizzleDb();
  }

  async createStaff(createStaffDto: CreateStaffDto, currentUserRole: string) {
    // Check if email already exists
    const existingUser = await this.db
      .select()
      .from(users)
      .where(eq(users.email, createStaffDto.email))
      .limit(1);

    if (existingUser.length > 0) {
      throw new ConflictException('Email already exists');
    }

    // Validate role is staff role (not customer)
    if ((createStaffDto.role as string) === 'customer') {
      throw new BadRequestException(
        'Cannot create customer accounts via staff endpoint',
      );
    }

    // Check if current user can create the requested role
    if (createStaffDto.role === 'admin' && currentUserRole !== 'super_admin') {
      throw new ForbiddenException(
        'Only super administrators can create admin accounts',
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(
      createStaffDto.password,
      this.BCRYPT_ROUNDS,
    );

    // Create user
    const [newUser] = await this.db
      .insert(users)
      .values({
        email: createStaffDto.email,
        password: hashedPassword,
        name: createStaffDto.name,
        phone: createStaffDto.phone,
        role: createStaffDto.role,
        is_active: true,
        email_verified: true, // Staff accounts are pre-verified
      })
      .returning();

    // Remove password from response
    const { password, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  }

  async listStaff(includeInactive = false) {
    // Build query to get all staff roles (admin, waiter, kitchen)
    const query = this.db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        phone: users.phone,
        role: users.role,
        is_active: users.is_active,
        email_verified: users.email_verified,
        created_at: users.created_at,
        last_login: users.last_login,
      })
      .from(users);

    // Filter by staff roles
    const conditions = [];

    if (!includeInactive) {
      conditions.push(eq(users.is_active, true));
    }

    const staff = await query
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(users.created_at);

    // Filter staff roles in application layer
    return staff.filter((u) => ['admin', 'waiter', 'kitchen'].includes(u.role));
  }

  async deactivateStaff(userId: string, reason?: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if ((user.role as string) === 'customer') {
      throw new BadRequestException(
        'Cannot deactivate customer accounts via staff endpoint',
      );
    }

    const [updated] = await this.db
      .update(users)
      .set({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .where(eq(users.id, userId))
      .returning();

    const { password, ...userWithoutPassword } = updated;
    return userWithoutPassword;
  }

  async activateStaff(userId: string) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [updated] = await this.db
      .update(users)
      .set({
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .where(eq(users.id, userId))
      .returning();

    const { password, ...userWithoutPassword } = updated;
    return userWithoutPassword;
  }

  async updateStaff(
    userId: string,
    updateStaffDto: UpdateStaffDto,
    currentUserRole: string,
  ) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if current user can update to the requested role
    if (updateStaffDto.role === 'admin' && currentUserRole !== 'super_admin') {
      throw new ForbiddenException(
        'Only super administrators can assign admin role',
      );
    }

    const [updated] = await this.db
      .update(users)
      .set({
        ...updateStaffDto,
        updated_at: new Date().toISOString(),
      })
      .where(eq(users.id, userId))
      .returning();

    const { password, ...userWithoutPassword } = updated;
    return userWithoutPassword;
  }
}
