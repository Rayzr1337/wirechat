import { describe, it, expect } from 'vitest';
import {
  usernameSchema,
  passwordSchema,
  registerBodySchema,
  loginBodySchema,
  updateProfileBodySchema,
  changePasswordBodySchema,
  requestEmailChangeBodySchema,
  verifyEmailQuerySchema,
} from '@/schemas/user.schema';

describe('User Schemas Validation', () => {
  describe('usernameSchema', () => {
    it('accepts valid username', () => {
      const result = usernameSchema.safeParse('validuser');
      expect(result.success).toBe(true);
    });

    it('accepts username with numbers and underscores', () => {
      const result = usernameSchema.safeParse('user_123');
      expect(result.success).toBe(true);
    });

    it('rejects username too short', () => {
      const result = usernameSchema.safeParse('ab');
      expect(result.success).toBe(false);
    });

    it('rejects username too long', () => {
      const result = usernameSchema.safeParse('a'.repeat(31));
      expect(result.success).toBe(false);
    });

    it('rejects username with special characters', () => {
      const result = usernameSchema.safeParse('user@name');
      expect(result.success).toBe(false);
    });

    it('trims whitespace', () => {
      const result = usernameSchema.safeParse('  validuser  ');
      expect(result.success).toBe(true);
      if (result.success) expect(result.data).toBe('validuser');
    });
  });

  describe('passwordSchema', () => {
    it('accepts valid password', () => {
      const result = passwordSchema.safeParse('password123');
      expect(result.success).toBe(true);
    });

    it('rejects password too short', () => {
      const result = passwordSchema.safeParse('1234567');
      expect(result.success).toBe(false);
    });

    it('rejects password too long', () => {
      const result = passwordSchema.safeParse('a'.repeat(129));
      expect(result.success).toBe(false);
    });

    it('accepts 8 character password', () => {
      const result = passwordSchema.safeParse('12345678');
      expect(result.success).toBe(true);
    });

    it('accepts 128 character password', () => {
      const result = passwordSchema.safeParse('a'.repeat(128));
      expect(result.success).toBe(true);
    });
  });

  describe('registerBodySchema', () => {
    it('accepts valid registration', () => {
      const result = registerBodySchema.safeParse({
        username: 'newuser',
        email: 'new@test.com',
        password: 'password123',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid email', () => {
      const result = registerBodySchema.safeParse({
        username: 'newuser',
        email: 'invalid-email',
        password: 'password123',
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing username', () => {
      const result = registerBodySchema.safeParse({
        email: 'new@test.com',
        password: 'password123',
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing email', () => {
      const result = registerBodySchema.safeParse({
        username: 'newuser',
        password: 'password123',
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing password', () => {
      const result = registerBodySchema.safeParse({
        username: 'newuser',
        email: 'new@test.com',
      });
      expect(result.success).toBe(false);
    });

    it('rejects short password', () => {
      const result = registerBodySchema.safeParse({
        username: 'newuser',
        email: 'new@test.com',
        password: '123',
      });
      expect(result.success).toBe(false);
    });

    it('rejects short username', () => {
      const result = registerBodySchema.safeParse({
        username: 'ab',
        email: 'new@test.com',
        password: 'password123',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('loginBodySchema', () => {
    it('accepts valid login', () => {
      const result = loginBodySchema.safeParse({
        email: 'test@test.com',
        password: 'password123',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid email', () => {
      const result = loginBodySchema.safeParse({
        email: 'invalid',
        password: 'password123',
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing password', () => {
      const result = loginBodySchema.safeParse({
        email: 'test@test.com',
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing email', () => {
      const result = loginBodySchema.safeParse({
        password: 'password123',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateProfileBodySchema', () => {
    it('accepts username only', () => {
      const result = updateProfileBodySchema.safeParse({ username: 'newname' });
      expect(result.success).toBe(true);
    });

    it('accepts avatarUrl only', () => {
      const result = updateProfileBodySchema.safeParse({ avatarUrl: 'https://example.com/avatar.png' });
      expect(result.success).toBe(true);
    });

    it('accepts both fields', () => {
      const result = updateProfileBodySchema.safeParse({
        username: 'newname',
        avatarUrl: 'https://example.com/avatar.png',
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty body', () => {
      const result = updateProfileBodySchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('rejects invalid avatarUrl', () => {
      const result = updateProfileBodySchema.safeParse({ avatarUrl: 'not-a-url' });
      expect(result.success).toBe(false);
    });

    it('rejects short username', () => {
      const result = updateProfileBodySchema.safeParse({ username: 'ab' });
      expect(result.success).toBe(false);
    });
  });

  describe('changePasswordBodySchema', () => {
    it('accepts valid password change', () => {
      const result = changePasswordBodySchema.safeParse({
        oldPassword: 'currentpass',
        newPassword: 'newpassword123',
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing oldPassword', () => {
      const result = changePasswordBodySchema.safeParse({ newPassword: 'newpassword123' });
      expect(result.success).toBe(false);
    });

    it('rejects missing newPassword', () => {
      const result = changePasswordBodySchema.safeParse({ oldPassword: 'currentpass' });
      expect(result.success).toBe(false);
    });

    it('rejects short newPassword', () => {
      const result = changePasswordBodySchema.safeParse({
        oldPassword: 'currentpass',
        newPassword: '123',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('requestEmailChangeBodySchema', () => {
    it('accepts valid email change', () => {
      const result = requestEmailChangeBodySchema.safeParse({ newEmail: 'new@test.com' });
      expect(result.success).toBe(true);
    });

    it('rejects invalid email', () => {
      const result = requestEmailChangeBodySchema.safeParse({ newEmail: 'invalid' });
      expect(result.success).toBe(false);
    });

    it('rejects missing newEmail', () => {
      const result = requestEmailChangeBodySchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('verifyEmailQuerySchema', () => {
    it('accepts valid UUID token', () => {
      const result = verifyEmailQuerySchema.safeParse({ token: '11111111-1111-4111-8111-111111111111' });
      expect(result.success).toBe(true);
    });

    it('rejects invalid UUID', () => {
      const result = verifyEmailQuerySchema.safeParse({ token: 'not-a-uuid' });
      expect(result.success).toBe(false);
    });

    it('rejects missing token', () => {
      const result = verifyEmailQuerySchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });
});