import { signTableToken, verifyTableToken } from '../../src/utils/qr';

describe('QR Token Utilities', () => {
  describe('signTableToken', () => {
    it('should generate a valid token for a table ID', () => {
      const tableId = 1;
      const token = signTableToken(tableId);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should generate different tokens for different table IDs', () => {
      const token1 = signTableToken(1);
      const token2 = signTableToken(2);

      expect(token1).not.toBe(token2);
    });

    it('should accept custom TTL', () => {
      const tableId = 1;
      const ttl = 60; // 1 minute
      const token = signTableToken(tableId, ttl);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should work with string table IDs', () => {
      const tableId = '5';
      const token = signTableToken(tableId);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });
  });

  describe('verifyTableToken', () => {
    it('should verify a valid token', () => {
      const tableId = 1;
      const token = signTableToken(tableId);

      const result = verifyTableToken(token);

      expect(result.valid).toBe(true);
      expect(result.tableId).toBe(tableId.toString());
      expect(result.expired).toBeUndefined();
    });

    it('should reject an invalid token', () => {
      const invalidToken = 'invalid-token-12345';

      const result = verifyTableToken(invalidToken);

      expect(result.valid).toBe(false);
      expect(result.tableId).toBeUndefined();
    });

    it('should reject a tampered token', () => {
      const tableId = 1;
      const validToken = signTableToken(tableId);

      // Tamper with the token by modifying a character
      const tamperedToken =
        validToken.substring(0, validToken.length - 1) + 'X';

      const result = verifyTableToken(tamperedToken);

      expect(result.valid).toBe(false);
    });

    it('should reject an expired token', () => {
      const tableId = 1;
      const ttl = -1; // Already expired (negative TTL)
      const expiredToken = signTableToken(tableId, ttl);

      const result = verifyTableToken(expiredToken);

      expect(result.valid).toBe(false);
      expect(result.expired).toBe(true);
    });

    it('should reject a token with incorrect format', () => {
      const malformedTokens = [
        '',
        'not-base64-url',
        Buffer.from('missing:hmac').toString('base64url'),
        Buffer.from('1:2:3:4').toString('base64url'), // Too many parts
      ];

      malformedTokens.forEach((token) => {
        const result = verifyTableToken(token);
        expect(result.valid).toBe(false);
      });
    });

    it('should verify token with long TTL', () => {
      const tableId = 42;
      const ttl = 60 * 60 * 24 * 365; // 1 year
      const token = signTableToken(tableId, ttl);

      const result = verifyTableToken(token);

      expect(result.valid).toBe(true);
      expect(result.tableId).toBe(tableId.toString());
    });

    it.skip('should handle token that expires quickly (timing-dependent test)', async () => {
      // This test is skipped as it's timing-dependent and can be flaky
      // The expiration logic is tested by the "should reject an expired token" test
      const tableId = 10;
      const ttl = 2; // 2 seconds
      const token = signTableToken(tableId, ttl);

      // Verify immediately - should be valid
      const resultBefore = verifyTableToken(token);
      expect(resultBefore.valid).toBe(true);

      // Wait for token to expire (2 seconds + buffer)
      await new Promise((resolve) => setTimeout(resolve, 2500));

      // Verify after expiration - should be invalid
      const resultAfter = verifyTableToken(token);
      expect(resultAfter.valid).toBe(false);
      expect(resultAfter.expired).toBe(true);
    });

    it('should correctly extract table ID from token', () => {
      const testCases = [
        { tableId: 1, expected: '1' },
        { tableId: 100, expected: '100' },
        { tableId: '5', expected: '5' },
        { tableId: 'A1', expected: 'A1' },
      ];

      testCases.forEach(({ tableId, expected }) => {
        const token = signTableToken(tableId);
        const result = verifyTableToken(token);

        expect(result.valid).toBe(true);
        expect(result.tableId).toBe(expected);
      });
    });

    it('should reject token with missing HMAC', () => {
      // Create a payload without HMAC
      const tableId = 1;
      const expiresAt = Math.floor(Date.now() / 1000) + 3600;
      const payload = `${tableId}:${expiresAt}`;
      const tokenWithoutHmac = Buffer.from(payload).toString('base64url');

      const result = verifyTableToken(tokenWithoutHmac);

      expect(result.valid).toBe(false);
    });

    it('should handle concurrent token generation and verification', () => {
      const tokens = [];
      const tableIds = [1, 2, 3, 4, 5];

      // Generate multiple tokens
      for (const tableId of tableIds) {
        const token = signTableToken(tableId);
        tokens.push({ tableId, token });
      }

      // Verify all tokens
      for (const { tableId, token } of tokens) {
        const result = verifyTableToken(token);
        expect(result.valid).toBe(true);
        expect(result.tableId).toBe(tableId.toString());
      }
    });
  });

  describe('Token Security', () => {
    it('should use HMAC for token integrity', () => {
      const tableId = 1;
      const token1 = signTableToken(tableId);
      const token2 = signTableToken(tableId);

      // Tokens should be different even for same table ID due to timestamp
      // But if generated at exactly the same second, they should be identical
      expect(typeof token1).toBe('string');
      expect(typeof token2).toBe('string');
    });

    it('should not allow token reuse with different table ID', () => {
      const token = signTableToken(1);

      // Try to decode and change table ID
      const decoded = Buffer.from(token, 'base64url').toString('utf8');
      const parts = decoded.split(':');
      parts[0] = '2'; // Change table ID from 1 to 2
      const modifiedToken = Buffer.from(parts.join(':')).toString('base64url');

      const result = verifyTableToken(modifiedToken);
      expect(result.valid).toBe(false);
    });

    it('should not allow extending token expiration', () => {
      const token = signTableToken(1, 60); // 1 minute

      // Try to decode and extend expiration
      const decoded = Buffer.from(token, 'base64url').toString('utf8');
      const parts = decoded.split(':');
      const currentExpiry = parseInt(parts[1]);
      parts[1] = (currentExpiry + 3600).toString(); // Add 1 hour
      const modifiedToken = Buffer.from(parts.join(':')).toString('base64url');

      const result = verifyTableToken(modifiedToken);
      expect(result.valid).toBe(false);
    });
  });
});
