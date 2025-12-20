import {
  Injectable,
  ConflictException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { eq, and } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { db } from '../db';
import {
  users,
  emailVerificationTokensTable,
  passwordResetTokensTable,
} from '../db/schema';
import { EmailService } from '../infrastructure/email.service';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class RegistrationService {
  constructor(private readonly emailService: EmailService) {}

  async register(
    registerDto: RegisterDto,
  ): Promise<{ message: string; userId: string }> {
    const { email, password, name, phone } = registerDto;

    // Check if user already exists
    const existingUsers = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (existingUsers.length > 0) {
      throw new ConflictException('User with this email already exists');
    }

    // Validate password strength
    this.validatePassword(password);

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user with customer role by default
    const [newUser] = await db
      .insert(users)
      .values({
        email: email.toLowerCase(),
        password: passwordHash,
        name: name || null,
        phone: phone || null,
        role: 'customer',
        is_active: true,
        email_verified: false,
      })
      .returning({ id: users.id });

    // Generate verification token
    const verificationToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store verification token
    await db.insert(emailVerificationTokensTable).values({
      userId: newUser.id,
      token: verificationToken,
      expiresAt: expiresAt,
      used: false,
    });

    // Send verification email
    try {
      await this.emailService.sendVerificationEmail(email, verificationToken);
    } catch (error) {
      // Log error but don't fail registration
      console.error('Failed to send verification email:', error);
    }

    return {
      message:
        'Registration successful. Please check your email to verify your account.',
      userId: newUser.id,
    };
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    // Find the verification token
    const [verificationRecord] = await db
      .select()
      .from(emailVerificationTokensTable)
      .where(eq(emailVerificationTokensTable.token, token))
      .limit(1);

    if (!verificationRecord) {
      throw new BadRequestException('Invalid verification token');
    }

    // Check if already used
    if (verificationRecord.used) {
      throw new BadRequestException('Verification token has already been used');
    }

    // Check if expired
    if (new Date(verificationRecord.expiresAt) < new Date()) {
      throw new BadRequestException('Verification token has expired');
    }

    // Update user email_verified status
    await db
      .update(users)
      .set({
        email_verified: true,
        updated_at: new Date().toISOString(),
      })
      .where(eq(users.id, verificationRecord.userId));

    // Mark token as used
    await db
      .update(emailVerificationTokensTable)
      .set({ used: true })
      .where(eq(emailVerificationTokensTable.id, verificationRecord.id));

    return { message: 'Email verified successfully' };
  }

  async resendVerificationEmail(email: string): Promise<{ message: string }> {
    // Find user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (!user) {
      // Don't reveal if user exists or not for security
      return {
        message: 'If an account exists, a verification email will be sent.',
      };
    }

    // Check if already verified
    if (user.email_verified) {
      throw new BadRequestException('Email is already verified');
    }

    // Delete old unused tokens for this user
    await db
      .delete(emailVerificationTokensTable)
      .where(
        and(
          eq(emailVerificationTokensTable.userId, user.id),
          eq(emailVerificationTokensTable.used, false),
        ),
      );

    // Generate new verification token
    const verificationToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store verification token
    await db.insert(emailVerificationTokensTable).values({
      userId: user.id,
      token: verificationToken,
      expiresAt: expiresAt,
      used: false,
    });

    // Send verification email
    try {
      await this.emailService.sendVerificationEmail(email, verificationToken);
    } catch (error) {
      console.error('Failed to send verification email:', error);
      throw new BadRequestException('Failed to send verification email');
    }

    return { message: 'Verification email sent' };
  }

  async requestPasswordReset(email: string): Promise<{ message: string }> {
    // Find user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    // Don't reveal if user exists or not for security
    if (!user) {
      return {
        message: 'If an account exists, a password reset email will be sent.',
      };
    }

    // Delete old unused tokens for this user
    await db
      .delete(passwordResetTokensTable)
      .where(
        and(
          eq(passwordResetTokensTable.userId, user.id),
          eq(passwordResetTokensTable.used, false),
        ),
      );

    // Generate reset token
    const resetToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    // Store reset token
    await db.insert(passwordResetTokensTable).values({
      userId: user.id,
      token: resetToken,
      expiresAt: expiresAt,
      used: false,
    });

    // Send password reset email
    try {
      await this.emailService.sendPasswordResetEmail(email, resetToken);
    } catch (error) {
      console.error('Failed to send password reset email:', error);
    }

    return {
      message: 'If an account exists, a password reset email will be sent.',
    };
  }

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    // Find the reset token
    const [resetRecord] = await db
      .select()
      .from(passwordResetTokensTable)
      .where(eq(passwordResetTokensTable.token, token))
      .limit(1);

    if (!resetRecord) {
      throw new BadRequestException('Invalid reset token');
    }

    // Check if already used
    if (resetRecord.used) {
      throw new BadRequestException('Reset token has already been used');
    }

    // Check if expired
    if (new Date(resetRecord.expiresAt) < new Date()) {
      throw new BadRequestException('Reset token has expired');
    }

    // Validate new password
    this.validatePassword(newPassword);

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update user password
    await db
      .update(users)
      .set({
        password: passwordHash,
        updated_at: new Date().toISOString(),
        failed_login_attempts: 0,
        locked_until: null,
      })
      .where(eq(users.id, resetRecord.userId));

    // Mark token as used
    await db
      .update(passwordResetTokensTable)
      .set({ used: true })
      .where(eq(passwordResetTokensTable.id, resetRecord.id));

    return { message: 'Password reset successfully' };
  }

  private validatePassword(password: string): void {
    if (password.length < 8) {
      throw new BadRequestException(
        'Password must be at least 8 characters long',
      );
    }

    if (password.length > 128) {
      throw new BadRequestException('Password must not exceed 128 characters');
    }

    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[@$!%*?&]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
      throw new BadRequestException(
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)',
      );
    }
  }
}
