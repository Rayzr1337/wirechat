import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createApp } from '@/app';
import request from 'supertest';
import { mockPrisma } from '@/../tests/mocks/prisma-client';
import { clearTestCounters } from '@/../tests/utils/factories';
import {
  registerUser,
  loginUser,
  getAuthAgent,
  clearEmailMock,
  assertErrorResponse,
} from '@/../tests/utils/auth-helpers';

const app = createApp();

describe('User Routes Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearTestCounters();
    clearEmailMock();
    mockPrisma.$transaction.mockImplementation(async (fn) => fn(mockPrisma));
    mockPrisma.roomMember.findMany.mockResolvedValue([]);
  });

  async function setupUser(): Promise<string> {
    const passwordHash = await require('bcrypt').hash('password123', 10);
    const mockUser = {
      id: 'user-1',
      username: 'testuser',
      email: 'test@test.com',
      passwordHash,
      emailVerified: false,
      emailVerificationToken: null,
      emailVerificationExpiresAt: null,
      pendingEmail: null,
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      roomMemberships: [],
      messages: [],
    };
    mockPrisma.user.findUnique.mockImplementation(async ({ where }: { where: { username?: string; email?: string; id?: string } }) => {
      if (where.username || where.email) return null;
      if (where.id === 'user-1') return mockUser;
      return null;
    });
    mockPrisma.user.create.mockResolvedValue(mockUser);
    const mockUserWithToken = { ...mockUser, emailVerificationToken: 'token-123', emailVerificationExpiresAt: new Date(Date.now() + 86400000) };
    mockPrisma.user.update.mockResolvedValue(mockUserWithToken);

    const { cookie } = await registerUser(app, 'testuser', 'test@test.com', 'password123');
    clearEmailMock();

    const verifiedUser = { ...mockUser, emailVerified: true, emailVerificationToken: null, emailVerificationExpiresAt: null };
    mockPrisma.user.findUnique.mockImplementation(async ({ where }: { where: { username?: string; email?: string; id?: string } }) => {
      if (where.id === 'user-1') return verifiedUser;
      if (where.username === 'newusername') return null;
      if (where.email === 'new@test.com') return null;
      if (where.email === 'taken@test.com') return { id: 'user-2', email: 'taken@test.com' };
      return null;
    });
    mockPrisma.user.update.mockResolvedValue(verifiedUser);
    mockPrisma.roomMember.findMany.mockResolvedValue([]);

    return cookie;
  }

  describe('GET /api/users/me', () => {
    it('returns user profile with auth', async () => {
      const cookie = await setupUser();

      const res = await getAuthAgent(app, cookie).get('/api/users/me').expect(200);

      expect(res.body).toMatchObject({
        id: 'user-1',
        username: 'testuser',
        email: 'test@test.com',
        emailVerified: true,
      });
    });

    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/users/me').expect(401);
      assertErrorResponse(res, 'UNAUTHORIZED', 401);
    });
  });

  describe('PATCH /api/users/me', () => {
    it('updates username', async () => {
      const cookie = await setupUser();
      const updatedUser = { id: 'user-1', username: 'newusername', email: 'test@test.com', emailVerified: true, avatarUrl: null };
      mockPrisma.user.update.mockResolvedValue(updatedUser);
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ id: 'user-1', username: 'testuser', email: 'test@test.com', emailVerified: true })
        .mockResolvedValueOnce(null);

      const res = await getAuthAgent(app, cookie)
        .patch('/api/users/me')
        .send({ username: 'newusername' })
        .expect(200);

      expect(res.body.username).toBe('newusername');
    });

    it('updates avatarUrl', async () => {
      const cookie = await setupUser();
      const updatedUser = { id: 'user-1', username: 'testuser', email: 'test@test.com', emailVerified: true, avatarUrl: 'https://example.com/avatar.png' };
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const res = await getAuthAgent(app, cookie)
        .patch('/api/users/me')
        .send({ avatarUrl: 'https://example.com/avatar.png' })
        .expect(200);

      expect(res.body.avatarUrl).toBe('https://example.com/avatar.png');
    });

    it('returns 409 for duplicate username', async () => {
      const cookie = await setupUser();
      // Override mock for duplicate username check
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ id: 'user-1', username: 'testuser', email: 'test@test.com', emailVerified: true }) // getUserById
        .mockResolvedValueOnce({ id: 'user-2', username: 'taken' }); // getUserByUsername - conflict

      const res = await getAuthAgent(app, cookie)
        .patch('/api/users/me')
        .send({ username: 'taken' })
        .expect(409);

      assertErrorResponse(res, 'CONFLICT', 409);
    });

    it('returns 400 for empty body', async () => {
      const cookie = await setupUser();

      const res = await getAuthAgent(app, cookie)
        .patch('/api/users/me')
        .send({})
        .expect(400);

      assertErrorResponse(res, 'VALIDATION_ERROR', 400);
    });
  });

  describe('PATCH /api/users/me/password', () => {
    it('changes password', async () => {
      const cookie = await setupUser();
      const updatedUser = { id: 'user-1', username: 'testuser', email: 'test@test.com', emailVerified: true };
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const res = await getAuthAgent(app, cookie)
        .patch('/api/users/me/password')
        .send({ oldPassword: 'password123', newPassword: 'newpassword123' })
        .expect(200);

      expect(res.body.message).toBe('Password changed successfully.');
    });

    it('returns 401 for wrong old password', async () => {
      const cookie = await setupUser();

      const res = await getAuthAgent(app, cookie)
        .patch('/api/users/me/password')
        .send({ oldPassword: 'wrong', newPassword: 'newpassword123' })
        .expect(401);

      assertErrorResponse(res, 'UNAUTHORIZED', 401);
    });
  });

  describe('POST /api/users/me/change-email', () => {
    it('requests email change', async () => {
      const cookie = await setupUser();
      const updatedUser = { id: 'user-1', username: 'testuser', email: 'test@test.com', pendingEmail: 'new@test.com', emailVerified: false };
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const res = await getAuthAgent(app, cookie)
        .post('/api/users/me/change-email')
        .send({ newEmail: 'new@test.com' })
        .expect(200);

      expect(res.body.message).toBe('Verification email sent to new address.');
    });

    it('returns 409 for duplicate email', async () => {
      const cookie = await setupUser();

      const res = await getAuthAgent(app, cookie)
        .post('/api/users/me/change-email')
        .send({ newEmail: 'taken@test.com' })
        .expect(409);

      assertErrorResponse(res, 'CONFLICT', 409);
    });
  });
});