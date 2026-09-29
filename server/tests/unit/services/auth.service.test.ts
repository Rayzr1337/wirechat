import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as authService from '@/services/auth.service';
import { userRepository } from '@/repositories/user.repository';
import { mockPrisma } from '@/../tests/mocks/prisma-client';
import { createTestUser } from '@/../tests/utils/factories';
import { AppError } from '@/middleware/error.middleware';

vi.mock('@/repositories/user.repository');
vi.mock('@/libs/redis', () => ({
  redisClient: {
    set: vi.fn().mockResolvedValue('OK'),
    getDel: vi.fn().mockResolvedValue(null),
  },
}));

describe('auth.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(async (fn) => fn(mockPrisma));
  });

  describe('createUser', () => {
    it('creates user successfully', async () => {
      const mockUser = createTestUser({ username: 'newuser', email: 'new@test.com' });
      vi.mocked(userRepository.createUser).mockResolvedValue(mockUser);
      vi.mocked(userRepository.getUserByUsername).mockResolvedValue(null);
      vi.mocked(userRepository.getUserByEmail).mockResolvedValue(null);

      const user = await authService.createUser({
        username: 'newuser',
        email: 'new@test.com',
        password: 'password123',
      });

      expect(user).toEqual(mockUser);
      expect(userRepository.createUser).toHaveBeenCalledWith(
        expect.objectContaining({ username: 'newuser', email: 'new@test.com' })
      );
    });

    it('throws CONFLICT for duplicate username', async () => {
      vi.mocked(userRepository.getUserByUsername).mockResolvedValue(createTestUser());

      await expect(authService.createUser({
        username: 'existing',
        email: 'new@test.com',
        password: 'password123',
      })).rejects.toMatchObject({ code: 'CONFLICT', statusCode: 409 });
    });

    it('throws CONFLICT for duplicate email', async () => {
      vi.mocked(userRepository.getUserByUsername).mockResolvedValue(null);
      vi.mocked(userRepository.getUserByEmail).mockResolvedValue(createTestUser());

      await expect(authService.createUser({
        username: 'newuser',
        email: 'existing@test.com',
        password: 'password123',
      })).rejects.toMatchObject({ code: 'CONFLICT', statusCode: 409 });
    });
  });

  describe('loginUser', () => {
    it('returns user on valid credentials', async () => {
      const passwordHash = await require('bcrypt').hash('password123', 10);
      const user = createTestUser({ email: 'test@test.com', passwordHash });
      vi.mocked(userRepository.getUserByEmail).mockResolvedValue(user);

      const result = await authService.loginUser({ email: 'test@test.com', password: 'password123' });

      expect(result).toEqual(user);
    });

    it('throws UNAUTHORIZED for non-existent user', async () => {
      vi.mocked(userRepository.getUserByEmail).mockResolvedValue(null);

      await expect(authService.loginUser({ email: 'none@test.com', password: 'password123' }))
        .rejects.toMatchObject({ code: 'UNAUTHORIZED', statusCode: 401 });
    });

    it('throws UNAUTHORIZED for wrong password', async () => {
      const user = createTestUser({ email: 'test@test.com', passwordHash: await require('bcrypt').hash('correct', 10) });
      vi.mocked(userRepository.getUserByEmail).mockResolvedValue(user);

      await expect(authService.loginUser({ email: 'test@test.com', password: 'wrong' }))
        .rejects.toMatchObject({ code: 'UNAUTHORIZED', statusCode: 401 });
    });
  });

  describe('issueToken', () => {
    it('returns valid JWT', () => {
      const token = authService.issueToken('user-123');
      expect(token).toBeDefined();
      const decoded = require('jsonwebtoken').decode(token);
      expect(decoded).toMatchObject({ userId: 'user-123' });
    });

    it('throws if JWT_SECRET not set', async () => {
      vi.resetModules();
      delete process.env.JWT_SECRET;
      const freshAuth = await import('@/services/auth.service');
      
      expect(() => freshAuth.issueToken('user-123')).toThrow('JWT Secret is not defined');
      
      process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
    });
  });

  describe('issueWsTicket', () => {
    it('creates ticket in Redis with 10s TTL', async () => {
      const { redisClient } = await import('@/libs/redis');
      const ticket = await authService.issueWsTicket('user-123');
      
      expect(ticket).toMatch(/^[a-f0-9-]+$/);
      expect(redisClient.set).toHaveBeenCalledWith(
        expect.stringMatching(/^ticket:/),
        'user-123',
        expect.objectContaining({ EX: 10 })
      );
    });
  });
});