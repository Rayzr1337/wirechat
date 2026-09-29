import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as userService from '@/services/user.service';
import { userRepository } from '@/repositories/user.repository';
import { roomRepository } from '@/repositories/room.repository';
import * as emailService from '@/services/email.service';
import { mockPrisma } from '@/../tests/mocks/prisma-client';
import { mockNodemailer } from '@/../tests/mocks/nodemailer';
import { createTestUser, clearTestCounters } from '@/../tests/utils/factories';
import { AppError } from '@/middleware/error.middleware';

vi.mock('@/repositories/user.repository');
vi.mock('@/repositories/room.repository');
vi.mock('@/services/email.service');
vi.mock('@/ws/broadcast', () => ({
  broadcastToRoom: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/libs/redis', () => ({
  redisClient: {
    set: vi.fn().mockResolvedValue('OK'),
    getDel: vi.fn().mockResolvedValue(null),
    del: vi.fn().mockResolvedValue(1),
  },
}));

describe('user.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNodemailer.sentEmails.length = 0;
    clearTestCounters();
    mockPrisma.$transaction.mockImplementation(async (fn) => fn(mockPrisma));
  });

  describe('getUserById', () => {
    it('returns user by id', async () => {
      const user = createTestUser({ id: 'user-1', username: 'testuser' });
      vi.mocked(userRepository.getUserById).mockResolvedValue(user);

      const result = await userService.getUserById('user-1');

      expect(result).toEqual(user);
      expect(userRepository.getUserById).toHaveBeenCalledWith('user-1');
    });

    it('throws USER_NOT_FOUND for non-existent user', async () => {
      vi.mocked(userRepository.getUserById).mockResolvedValue(null);

      await expect(userService.getUserById('user-999'))
        .rejects.toMatchObject({ code: 'USER_NOT_FOUND', statusCode: 404 });
    });
  });

  describe('getUserByUsername', () => {
    it('returns user by username', async () => {
      const user = createTestUser({ username: 'testuser' });
      vi.mocked(userRepository.getUserByUsername).mockResolvedValue(user);

      const result = await userService.getUserByUsername('testuser');

      expect(result).toEqual(user);
    });

    it('throws USER_NOT_FOUND for non-existent username', async () => {
      vi.mocked(userRepository.getUserByUsername).mockResolvedValue(null);

      await expect(userService.getUserByUsername('nonexistent'))
        .rejects.toMatchObject({ code: 'USER_NOT_FOUND', statusCode: 404 });
    });
  });

  describe('getUserByEmail', () => {
    it('returns user by email', async () => {
      const user = createTestUser({ email: 'test@test.com' });
      vi.mocked(userRepository.getUserByEmail).mockResolvedValue(user);

      const result = await userService.getUserByEmail('test@test.com');

      expect(result).toEqual(user);
    });

    it('throws USER_NOT_FOUND for non-existent email', async () => {
      vi.mocked(userRepository.getUserByEmail).mockResolvedValue(null);

      await expect(userService.getUserByEmail('none@test.com'))
        .rejects.toMatchObject({ code: 'USER_NOT_FOUND', statusCode: 404 });
    });
  });

  describe('updateUser', () => {
    it('updates user username', async () => {
      const user = createTestUser({ id: 'user-1', username: 'oldname' });
      const updated = createTestUser({ id: 'user-1', username: 'newname' });
      
      vi.mocked(userRepository.getUserById).mockResolvedValue(user);
      vi.mocked(userRepository.getUserByUsername).mockResolvedValue(null);
      vi.mocked(userRepository.updateUser).mockResolvedValue(updated);
      vi.mocked(roomRepository.getRoomsForUser).mockResolvedValue([]);

      const result = await userService.updateUser('user-1', { username: 'newname' });

      expect(result.username).toBe('newname');
      expect(userRepository.updateUser).toHaveBeenCalledWith('user-1', { username: 'newname' });
    });

    it('throws CONFLICT for duplicate username', async () => {
      const user = createTestUser({ id: 'user-1', username: 'oldname' });
      vi.mocked(userRepository.getUserById).mockResolvedValue(user);
      vi.mocked(userRepository.getUserByUsername).mockResolvedValue(createTestUser({ username: 'taken' }));

      await expect(userService.updateUser('user-1', { username: 'taken' }))
        .rejects.toMatchObject({ code: 'CONFLICT', statusCode: 409 });
    });

    it('broadcasts USER_UPDATED when username changes', async () => {
      const user = createTestUser({ id: 'user-1', username: 'oldname' });
      const updated = createTestUser({ id: 'user-1', username: 'newname' });
      
      vi.mocked(userRepository.getUserById).mockResolvedValue(user);
      vi.mocked(userRepository.getUserByUsername).mockResolvedValue(null);
      vi.mocked(userRepository.updateUser).mockResolvedValue(updated);
      vi.mocked(roomRepository.getRoomsForUser).mockResolvedValue([
        { roomId: 'room-1', role: 'MEMBER' },
      ]);
      const { broadcastToRoom } = await import('@/ws/broadcast');

      await userService.updateUser('user-1', { username: 'newname' });

      expect(broadcastToRoom).toHaveBeenCalledWith(
        'room-1',
        expect.objectContaining({ type: 'USER_UPDATED', payload: { userId: 'user-1', username: 'newname' } })
      );
    });
  });

  describe('changePassword', () => {
    it('changes password successfully', async () => {
      const passwordHash = await require('bcrypt').hash('oldpass', 10);
      const user = createTestUser({ id: 'user-1', passwordHash });
      vi.mocked(userRepository.getUserById).mockResolvedValue(user);
      vi.mocked(userRepository.updateUser).mockResolvedValue(user);

      const result = await userService.changePassword('user-1', 'oldpass', 'newpass123');

      expect(result).toEqual(user);
      expect(userRepository.updateUser).toHaveBeenCalledWith('user-1', expect.objectContaining({ passwordHash: expect.any(String) }));
    });

    it('throws UNAUTHORIZED for wrong old password', async () => {
      const user = createTestUser({ id: 'user-1', passwordHash: await require('bcrypt').hash('correct', 10) });
      vi.mocked(userRepository.getUserById).mockResolvedValue(user);

      await expect(userService.changePassword('user-1', 'wrong', 'newpass'))
        .rejects.toMatchObject({ code: 'UNAUTHORIZED', statusCode: 401 });
    });

    it('throws USER_NOT_FOUND for non-existent user', async () => {
      vi.mocked(userRepository.getUserById).mockResolvedValue(null);

      await expect(userService.changePassword('user-999', 'old', 'new'))
        .rejects.toMatchObject({ code: 'USER_NOT_FOUND', statusCode: 404 });
    });
  });

  describe('deleteUser', () => {
    it('deletes user', async () => {
      const user = createTestUser({ id: 'user-1' });
      vi.mocked(userRepository.getUserById).mockResolvedValue(user);
      vi.mocked(userRepository.deleteUser).mockResolvedValue(user);

      const result = await userService.deleteUser('user-1');

      expect(result).toEqual(user);
    });
  });

  describe('initiateEmailVerification', () => {
    it('creates token and sends email', async () => {
      const user = createTestUser({ id: 'user-1', email: 'test@test.com', emailVerified: false, username: 'testuser' });
      vi.mocked(userRepository.getUserById).mockResolvedValue(user);
      vi.mocked(userRepository.updateUser).mockResolvedValue({ ...user, emailVerificationToken: 'token-123' });

      const token = await userService.initiateEmailVerification('user-1');

      expect(token).toMatch(/^[a-f0-9-]+$/);
      expect(userRepository.updateUser).toHaveBeenCalledWith('user-1', expect.objectContaining({
        emailVerificationToken: expect.any(String),
        emailVerificationExpiresAt: expect.any(Date),
      }));
      expect(emailService.sendVerificationMail).toHaveBeenCalledWith('test@test.com', 'testuser', expect.any(String));
    });

    it('throws ALREADY_VERIFIED if email already verified', async () => {
      const user = createTestUser({ emailVerified: true });
      vi.mocked(userRepository.getUserById).mockResolvedValue(user);

      await expect(userService.initiateEmailVerification('user-1'))
        .rejects.toMatchObject({ code: 'ALREADY_VERIFIED', statusCode: 400 });
    });
  });

  describe('requestEmailChange', () => {
    it('requests email change and sends email', async () => {
      const user = createTestUser({ id: 'user-1', email: 'old@test.com', emailVerified: true, username: 'testuser' });
      vi.mocked(userRepository.getUserById).mockResolvedValue(user);
      vi.mocked(userRepository.getUserByEmail).mockResolvedValue(null);
      vi.mocked(userRepository.updateUser).mockResolvedValue({ ...user, pendingEmail: 'new@test.com' });

      const token = await userService.requestEmailChange('user-1', 'new@test.com');

      expect(token).toMatch(/^[a-f0-9-]+$/);
      expect(userRepository.updateUser).toHaveBeenCalledWith('user-1', expect.objectContaining({
        pendingEmail: 'new@test.com',
        emailVerified: false,
        emailVerificationToken: expect.any(String),
        emailVerificationExpiresAt: expect.any(Date),
      }));
      expect(emailService.sendVerificationMail).toHaveBeenCalledWith('new@test.com', 'testuser', expect.any(String));
    });

    it('throws CONFLICT if new email already in use', async () => {
      vi.mocked(userRepository.getUserById).mockResolvedValue(createTestUser({ username: 'testuser' }));
      vi.mocked(userRepository.getUserByEmail).mockResolvedValue(createTestUser({ email: 'new@test.com' }));

      await expect(userService.requestEmailChange('user-1', 'new@test.com'))
        .rejects.toMatchObject({ code: 'CONFLICT', statusCode: 409 });
    });
  });

  describe('verifyEmail', () => {
    it('verifies email with valid token', async () => {
      const validToken = 'valid-token';
      const expiresAt = new Date(Date.now() + 3600000);
      const user = {
        id: 'user-1',
        email: 'old@test.com',
        pendingEmail: 'new@test.com',
        emailVerified: false,
        emailVerificationToken: 'valid-token',
        emailVerificationExpiresAt: new Date(Date.now() + 3600000),
      };
      vi.mocked(userRepository.getUserByVerificationToken).mockResolvedValue(user);
      vi.mocked(userRepository.updateUser).mockResolvedValue({ 
        ...user, 
        email: 'new@test.com', 
        emailVerified: true, 
        pendingEmail: null, 
        emailVerificationToken: null, 
        emailVerificationExpiresAt: null 
      });
      const { redisClient } = await import('@/libs/redis');

      const updated = await userService.verifyEmail('valid-token');

      expect(updated.email).toBe('new@test.com');
      expect(updated.emailVerified).toBe(true);
      expect(updated.pendingEmail).toBeNull();
      expect(redisClient.del).toHaveBeenCalledWith('verified:user-1');
    });

    it('throws INVALID_TOKEN for non-existent token', async () => {
      vi.mocked(userRepository.getUserByVerificationToken).mockResolvedValue(null);

      await expect(userService.verifyEmail('invalid-token'))
        .rejects.toMatchObject({ code: 'INVALID_TOKEN', statusCode: 400 });
    });

    it('throws INVALID_TOKEN for expired token', async () => {
      const user = { 
        emailVerificationToken: 'expired-token',
        emailVerificationExpiresAt: new Date(Date.now() - 1000),
      };
      vi.mocked(userRepository.getUserByVerificationToken).mockResolvedValue(user);

      await expect(userService.verifyEmail('expired-token'))
        .rejects.toMatchObject({ code: 'INVALID_TOKEN', statusCode: 400 });
    });
  });
});