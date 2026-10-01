import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createApp } from '@/app';
import request from 'supertest';
import { mockPrisma } from '@/../tests/mocks/prisma-client';
import { mockNodemailer } from '@/../tests/mocks/nodemailer';
import { createTestUser, clearTestCounters } from '@/../tests/utils/factories';
import {
  registerUser,
  loginUser,
  logoutUser,
  getWsTicket,
  verifyEmailToken,
  resendVerification,
  clearEmailMock,
  getSentEmails,
  assertErrorResponse,
  RegisteredUser,
} from '@/../tests/utils/auth-helpers';

const app = createApp();

describe('Auth Controller Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearTestCounters();
    clearEmailMock();
    mockPrisma.$transaction.mockImplementation(async (fn) => fn(mockPrisma));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('registers new user successfully', async () => {
      const mockUser = {
        id: 'user-1',
        username: 'newuser',
        email: 'new@test.com',
        passwordHash: 'hashedpassword',
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
      mockPrisma.user.create.mockResolvedValue(mockUser);
      mockPrisma.user.findUnique.mockImplementation(async ({ where }: { where: { username?: string; email?: string; id?: string } }) => {
        if (where.username || where.email) return null;
        return null;
      });

      const user = await registerUser(app, 'newuser', 'new@test.com', 'password123');

      expect(user.id).toBe('user-1');
      expect(user.username).toBe('newuser');
      expect(user.email).toBe('new@test.com');
      expect(user.cookie.name).toBe('token');
      expect(user.cookie.value).toBeDefined();
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ username: 'newuser', email: 'new@test.com' }),
        })
      );
    });

    it('returns 409 CONFLICT for duplicate username', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(createTestUser({ username: 'existing' })).mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'existing', email: 'new@test.com', password: 'password123' })
        .expect(409);

      assertErrorResponse(res, 'CONFLICT', 409);
    });

    it('returns 409 CONFLICT for duplicate email', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(createTestUser({ email: 'existing@test.com' }));

      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'newuser', email: 'existing@test.com', password: 'password123' })
        .expect(409);

      assertErrorResponse(res, 'CONFLICT', 409);
    });

    it('returns 400 for missing username', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@test.com', password: 'password123' })
        .expect(400);

      assertErrorResponse(res, 'VALIDATION_ERROR', 400);
    });

    it('returns 400 for missing email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'testuser', password: 'password123' })
        .expect(400);

      assertErrorResponse(res, 'VALIDATION_ERROR', 400);
    });

    it('returns 400 for missing password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'testuser', email: 'test@test.com' })
        .expect(400);

      assertErrorResponse(res, 'VALIDATION_ERROR', 400);
    });

    it('returns 400 for invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'testuser', email: 'invalid', password: 'password123' })
        .expect(400);

      assertErrorResponse(res, 'VALIDATION_ERROR', 400);
    });

    it('returns 400 for short password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'testuser', email: 'test@test.com', password: '123' })
        .expect(400);

      assertErrorResponse(res, 'VALIDATION_ERROR', 400);
    });

    it('sends verification email on registration', async () => {
      const mockUser = {
        id: 'user-1',
        username: 'newuser',
        email: 'new@test.com',
        passwordHash: 'hashedpassword',
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
      const mockUserWithToken = { ...mockUser, emailVerificationToken: 'token-123', emailVerificationExpiresAt: new Date(Date.now() + 86400000) };
      
      mockPrisma.user.create.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(mockUserWithToken);
      mockPrisma.user.findUnique.mockImplementation(async ({ where }: { where: { username?: string; email?: string; id?: string } }) => {
        if (where.username || where.email) return null;
        if (where.id === 'user-1') return mockUser;
        return null;
      });

      await registerUser(app, 'newuser', 'new@test.com', 'password123');

      const emails = getSentEmails();
      expect(emails).toHaveLength(1);
      expect(emails[0].to).toBe('new@test.com');
      expect(emails[0].subject).toBe('Verify your email address - wirechat');
    });
  });

  describe('POST /api/auth/login', () => {
    it('logs in user with valid credentials', async () => {
      const passwordHash = await require('bcrypt').hash('password123', 10);
      const mockUser = createTestUser({ email: 'test@test.com', passwordHash, id: 'user-1' });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const cookie = await loginUser(app, 'test@test.com', 'password123');

      expect(cookie.name).toBe('token');
      expect(cookie.value).toBeDefined();
    });

    it('returns 401 UNAUTHORIZED for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'none@test.com', password: 'password123' })
        .expect(401);

      assertErrorResponse(res, 'UNAUTHORIZED', 401);
    });

    it('returns 401 UNAUTHORIZED for wrong password', async () => {
      const passwordHash = await require('bcrypt').hash('correct', 10);
      const mockUser = createTestUser({ email: 'test@test.com', passwordHash, id: 'user-1' });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: 'wrong' })
        .expect(401);

      assertErrorResponse(res, 'UNAUTHORIZED', 401);
    });

    it('returns 400 for missing email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ password: 'password123' })
        .expect(400);

      assertErrorResponse(res, 'VALIDATION_ERROR', 400);
    });

    it('returns 400 for missing password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com' })
        .expect(400);

      assertErrorResponse(res, 'VALIDATION_ERROR', 400);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('clears auth cookie on logout', async () => {
      const passwordHash = await require('bcrypt').hash('password123', 10);
      const mockUser = createTestUser({ email: 'test@test.com', passwordHash, id: 'user-1' });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const cookie = await loginUser(app, 'test@test.com', 'password123');

      await logoutUser(app, cookie);

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', `${cookie.name}=${cookie.value}`)
        .expect(200);

      expect(res.body.message).toBe('Logged out successfully.');
      const clearedCookie = res.headers['set-cookie']?.[0];
      expect(clearedCookie).toContain('token=');
      expect(clearedCookie).toContain('Expires=');
    });

    it('works without auth cookie', async () => {
      await request(app).post('/api/auth/logout').expect(200);
    });
  });

  describe('POST /api/auth/ws-ticket', () => {
    it('issues WS ticket for authenticated user', async () => {
      const passwordHash = await require('bcrypt').hash('password123', 10);
      const mockUser = createTestUser({ email: 'test@test.com', passwordHash, id: 'user-1' });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const cookie = await loginUser(app, 'test@test.com', 'password123');

      const ticket = await getWsTicket(app, cookie);

      expect(ticket).toMatch(/^[a-f0-9-]+$/);
    });

    it('returns 401 UNAUTHORIZED without auth cookie', async () => {
      const res = await request(app)
        .post('/api/auth/ws-ticket')
        .expect(401);

      assertErrorResponse(res, 'UNAUTHORIZED', 401);
    });

    it('returns 401 UNAUTHORIZED with invalid token', async () => {
      const res = await request(app)
        .post('/api/auth/ws-ticket')
        .set('Cookie', 'token=invalid-token')
        .expect(401);

      assertErrorResponse(res, 'UNAUTHORIZED', 401);
    });
  });

  describe('GET /api/auth/verify-email', () => {
    it('verifies email with valid token', async () => {
      const user = {
        id: 'user-1',
        email: 'old@test.com',
        pendingEmail: 'new@test.com',
        emailVerified: false,
        emailVerificationToken: 'valid-token',
        emailVerificationExpiresAt: new Date(Date.now() + 3600000),
      };
      mockPrisma.user.findUnique.mockResolvedValue(user);
      mockPrisma.user.update.mockResolvedValue({
        ...user,
        email: 'new@test.com',
        emailVerified: true,
        pendingEmail: null,
        emailVerificationToken: null,
        emailVerificationExpiresAt: null,
      });

      await verifyEmailToken(app, 'valid-token');
    });

    it('returns 400 INVALID_TOKEN for non-existent token', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/auth/verify-email')
        .query({ token: 'invalid-token' })
        .expect(400);

      assertErrorResponse(res, 'INVALID_TOKEN', 400);
    });

    it('returns 400 INVALID_TOKEN for expired token', async () => {
      const user = {
        emailVerificationToken: 'expired-token',
        emailVerificationExpiresAt: new Date(Date.now() - 1000),
      };
      mockPrisma.user.findUnique.mockResolvedValue(user);

      const res = await request(app)
        .get('/api/auth/verify-email')
        .query({ token: 'expired-token' })
        .expect(400);

      assertErrorResponse(res, 'INVALID_TOKEN', 400);
    });

    it('returns 400 for missing token query param', async () => {
      const res = await request(app)
        .get('/api/auth/verify-email')
        .expect(400);

      assertErrorResponse(res, 'INVALID_TOKEN', 400);
    });
  });

  describe('POST /api/auth/resend-verification', () => {
    it('resends verification email for authenticated user', async () => {
      const passwordHash = await require('bcrypt').hash('password123', 10);
      const mockUser = createTestUser({ email: 'test@test.com', passwordHash, id: 'user-1', emailVerified: false });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, emailVerificationToken: 'new-token' });

      const cookie = await loginUser(app, 'test@test.com', 'password123');

      await resendVerification(app, cookie);

      const emails = getSentEmails();
      expect(emails).toHaveLength(1);
      expect(emails[0].to).toBe('test@test.com');
    });

    it('returns 401 UNAUTHORIZED without auth cookie', async () => {
      const res = await request(app)
        .post('/api/auth/resend-verification')
        .expect(401);

      assertErrorResponse(res, 'UNAUTHORIZED', 401);
    });

    it('returns 400 ALREADY_VERIFIED if email already verified', async () => {
      const passwordHash = await require('bcrypt').hash('password123', 10);
      const mockUser = createTestUser({ email: 'test@test.com', passwordHash, id: 'user-1', emailVerified: true });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const cookie = await loginUser(app, 'test@test.com', 'password123');

      const res = await request(app)
        .post('/api/auth/resend-verification')
        .set('Cookie', `${cookie.name}=${cookie.value}`)
        .expect(400);

      assertErrorResponse(res, 'ALREADY_VERIFIED', 400);
    });
  });
});