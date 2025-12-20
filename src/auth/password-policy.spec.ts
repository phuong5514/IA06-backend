import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { RegistrationService } from '../../src/auth/registration.service';
import { EmailService } from '../../src/infrastructure/email.service';
import { db } from '../../src/db';
import { 
  users, 
  emailVerificationTokensTable,
  passwordResetTokensTable 
} from '../../src/db/schema';
import * as bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';

// Mock the database module
jest.mock('../../src/db', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

// Mock bcrypt
jest.mock('bcrypt');

describe('RegistrationService - Password Policy', () => {
  let service: RegistrationService;
  let emailService: EmailService;

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();

    // Mock EmailService
    const mockEmailService = {
      sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
      sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegistrationService,
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    service = module.get<RegistrationService>(RegistrationService);
    emailService = module.get<EmailService>(EmailService);
  });

  describe('Password Validation', () => {
    beforeEach(() => {
      // Setup mock chain for db.select()
      const mockFrom = jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([]), // No existing users
        }),
      });

      (db.select as jest.Mock).mockReturnValue({
        from: mockFrom,
      });

      // Mock bcrypt.hash
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');

      // Mock db.insert for users
      const mockReturning = jest.fn().mockResolvedValue([{ id: 'test-user-id' }]);
      const mockValues = jest.fn().mockReturnValue({
        returning: mockReturning,
      });

      (db.insert as jest.Mock).mockImplementation((table) => {
        if (table === users) {
          return { values: mockValues };
        }
        // For emailVerificationTokensTable
        return { values: jest.fn().mockResolvedValue([]) };
      });
    });

    it('should reject password shorter than 8 characters', async () => {
      await expect(
        service.register({
          email: 'test@example.com',
          password: 'Short1!',
          name: 'Test User',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject password longer than 128 characters', async () => {
      const longPassword = 'A'.repeat(120) + 'a1@';
      await expect(
        service.register({
          email: 'test@example.com',
          password: longPassword + 'X'.repeat(10), // Make it 133 chars
          name: 'Test User',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject password without uppercase letter', async () => {
      await expect(
        service.register({
          email: 'test@example.com',
          password: 'password123!',
          name: 'Test User',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject password without lowercase letter', async () => {
      await expect(
        service.register({
          email: 'test@example.com',
          password: 'PASSWORD123!',
          name: 'Test User',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject password without number', async () => {
      await expect(
        service.register({
          email: 'test@example.com',
          password: 'Password!',
          name: 'Test User',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject password without special character', async () => {
      await expect(
        service.register({
          email: 'test@example.com',
          password: 'Password123',
          name: 'Test User',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept valid password with all requirements', async () => {
      const result = await service.register({
        email: 'test@example.com',
        password: 'ValidPass123!',
        name: 'Test User',
      });

      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('userId');
      expect(bcrypt.hash).toHaveBeenCalledWith('ValidPass123!', 12);
    });

    it('should accept password with all supported special characters', async () => {
      const passwords = [
        'Password123@',
        'Password123$',
        'Password123!',
        'Password123%',
        'Password123*',
        'Password123?',
        'Password123&',
      ];

      for (const password of passwords) {
        const result = await service.register({
          email: `test${password}@example.com`,
          password,
          name: 'Test User',
        });
        expect(result).toHaveProperty('userId');
      }
    });
  });

  describe('Password Reset Token Handling', () => {
    const validResetToken = 'valid-reset-token-12345';
    const expiredResetToken = 'expired-reset-token-12345';
    const usedResetToken = 'used-reset-token-12345';
    const invalidResetToken = 'invalid-token';

    beforeEach(() => {
      // Mock bcrypt.hash for password reset
      (bcrypt.hash as jest.Mock).mockResolvedValue('new_hashed_password');
    });

    it('should successfully reset password with valid token', async () => {
      // Mock finding valid reset token
      const mockFrom = jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([
            {
              id: 'reset-record-id',
              userId: 'user-123',
              token: validResetToken,
              expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
              used: false,
            },
          ]),
        }),
      });

      (db.select as jest.Mock).mockReturnValue({
        from: mockFrom,
      });

      // Mock db.update for users
      const mockSet = jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([]),
      });

      (db.update as jest.Mock).mockReturnValue({
        set: mockSet,
      });

      const result = await service.resetPassword(validResetToken, 'NewPassword123!');

      expect(result).toEqual({ message: 'Password reset successfully' });
      expect(bcrypt.hash).toHaveBeenCalledWith('NewPassword123!', 12);
    });

    it('should reject invalid reset token', async () => {
      // Mock no token found
      const mockFrom = jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([]),
        }),
      });

      (db.select as jest.Mock).mockReturnValue({
        from: mockFrom,
      });

      await expect(
        service.resetPassword(invalidResetToken, 'NewPassword123!')
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject already used reset token', async () => {
      // Mock finding used reset token
      const mockFrom = jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([
            {
              id: 'reset-record-id',
              userId: 'user-123',
              token: usedResetToken,
              expiresAt: new Date(Date.now() + 60 * 60 * 1000),
              used: true, // Already used
            },
          ]),
        }),
      });

      (db.select as jest.Mock).mockReturnValue({
        from: mockFrom,
      });

      await expect(
        service.resetPassword(usedResetToken, 'NewPassword123!')
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject expired reset token', async () => {
      // Mock finding expired reset token
      const mockFrom = jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([
            {
              id: 'reset-record-id',
              userId: 'user-123',
              token: expiredResetToken,
              expiresAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
              used: false,
            },
          ]),
        }),
      });

      (db.select as jest.Mock).mockReturnValue({
        from: mockFrom,
      });

      await expect(
        service.resetPassword(expiredResetToken, 'NewPassword123!')
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate new password during reset', async () => {
      // Mock finding valid reset token
      const mockFrom = jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([
            {
              id: 'reset-record-id',
              userId: 'user-123',
              token: validResetToken,
              expiresAt: new Date(Date.now() + 60 * 60 * 1000),
              used: false,
            },
          ]),
        }),
      });

      (db.select as jest.Mock).mockReturnValue({
        from: mockFrom,
      });

      // Should reject weak password
      await expect(
        service.resetPassword(validResetToken, 'weak')
      ).rejects.toThrow(BadRequestException);
    });

    it('should reset failed_login_attempts and locked_until when password is reset', async () => {
      // Mock finding valid reset token
      const mockFrom = jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([
            {
              id: 'reset-record-id',
              userId: 'user-123',
              token: validResetToken,
              expiresAt: new Date(Date.now() + 60 * 60 * 1000),
              used: false,
            },
          ]),
        }),
      });

      (db.select as jest.Mock).mockReturnValue({
        from: mockFrom,
      });

      // Mock db.update for users
      const mockSet = jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue([]),
      });

      (db.update as jest.Mock).mockReturnValue({
        set: mockSet,
      });

      await service.resetPassword(validResetToken, 'NewPassword123!');

      // Verify that the update was called with failed_login_attempts and locked_until reset
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          failed_login_attempts: 0,
          locked_until: null,
        })
      );
    });
  });

  describe('Password Reset Request', () => {
    it('should generate reset token for existing user', async () => {
      // Mock finding user
      const mockFrom = jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([
            {
              id: 'user-123',
              email: 'test@example.com',
            },
          ]),
        }),
      });

      (db.select as jest.Mock).mockReturnValue({
        from: mockFrom,
      });

      // Mock db.delete for old tokens
      const mockWhere = jest.fn().mockResolvedValue([]);
      (db.delete as jest.Mock).mockReturnValue({
        where: mockWhere,
      });

      // Mock db.insert for new token
      const mockValues = jest.fn().mockResolvedValue([]);
      (db.insert as jest.Mock).mockReturnValue({
        values: mockValues,
      });

      const result = await service.requestPasswordReset('test@example.com');

      expect(result).toEqual({ 
        message: 'If an account exists, a password reset email will be sent.' 
      });
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalled();
    });

    it('should not reveal if user does not exist', async () => {
      // Mock no user found
      const mockFrom = jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([]),
        }),
      });

      (db.select as jest.Mock).mockReturnValue({
        from: mockFrom,
      });

      const result = await service.requestPasswordReset('nonexistent@example.com');

      expect(result).toEqual({ 
        message: 'If an account exists, a password reset email will be sent.' 
      });
      expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('should delete old unused tokens before creating new one', async () => {
      // Mock finding user
      const mockFrom = jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([
            {
              id: 'user-123',
              email: 'test@example.com',
            },
          ]),
        }),
      });

      (db.select as jest.Mock).mockReturnValue({
        from: mockFrom,
      });

      // Mock db.delete
      const mockWhere = jest.fn().mockResolvedValue([]);
      (db.delete as jest.Mock).mockReturnValue({
        where: mockWhere,
      });

      // Mock db.insert
      const mockValues = jest.fn().mockResolvedValue([]);
      (db.insert as jest.Mock).mockReturnValue({
        values: mockValues,
      });

      await service.requestPasswordReset('test@example.com');

      expect(db.delete).toHaveBeenCalled();
      expect(mockWhere).toHaveBeenCalled();
    });

    it('should set token expiration to 1 hour', async () => {
      // Mock finding user
      const mockFrom = jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([
            {
              id: 'user-123',
              email: 'test@example.com',
            },
          ]),
        }),
      });

      (db.select as jest.Mock).mockReturnValue({
        from: mockFrom,
      });

      // Mock db.delete
      const mockWhere = jest.fn().mockResolvedValue([]);
      (db.delete as jest.Mock).mockReturnValue({
        where: mockWhere,
      });

      // Mock db.insert
      const mockValues = jest.fn();
      mockValues.mockResolvedValue([]);
      (db.insert as jest.Mock).mockReturnValue({
        values: mockValues,
      });

      const beforeTime = Date.now();
      await service.requestPasswordReset('test@example.com');
      const afterTime = Date.now();

      // Verify token expiration is approximately 1 hour from now
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          used: false,
        })
      );

      // Check that expiresAt is within the expected range
      const callArgs = mockValues.mock.calls[0][0];
      const expiresAt = new Date(callArgs.expiresAt).getTime();
      const expectedMin = beforeTime + 59 * 60 * 1000; // 59 minutes
      const expectedMax = afterTime + 61 * 60 * 1000; // 61 minutes

      expect(expiresAt).toBeGreaterThanOrEqual(expectedMin);
      expect(expiresAt).toBeLessThanOrEqual(expectedMax);
    });
  });
});
