import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createApp } from '@/app';
import request from 'supertest';
import { mockPrisma } from '@/../tests/mocks/prisma-client';
import { mockNodemailer } from '@/../tests/mocks/nodemailer';
import { clearTestCounters } from '@/../tests/utils/factories';
import {
  registerUser,
  loginUser,
  getAuthAgent,
  clearEmailMock,
  assertErrorResponse,
  RegisteredUser,
} from '@/../tests/utils/auth-helpers';

const app = createApp();

describe('Auth Routes Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearTestCounters();
    clearEmailMock();
    mockPrisma.$transaction.mockImplementation(async (fn) => fn(mockPrisma));
  });

  describe('POST /api/auth/register', () => {
    it('registers user and returns 201', async () => {
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
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const mockUserWithToken = { ...mockUser, emailVerificationToken: 'token-123', emailVerificationExpiresAt: new Date(Date.now() + 86400000) };
      mockPrisma.user.update.mockResolvedValue(mockUserWithToken);

      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'newuser', email: 'new@test.com', password: 'password123' })
        .expect(201);

      expect(res.body).toMatchObject({ username: 'newuser', email: 'new@test.com' });
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('returns 409 for duplicate username', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ id: 'user-1', username: 'existing' }).mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'existing', email: 'new@test.com', password: 'password123' })
        .expect(409);

      assertErrorResponse(res, 'CONFLICT', 409);
    });

    it('returns 409 for duplicate email', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'user-1', email: 'existing@test.com' });

      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'newuser', email: 'existing@test.com', password: 'password123' })
        .expect(409);

      assertErrorResponse(res, 'CONFLICT', 409);
    });

    it('returns 400 for invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'newuser', email: 'invalid', password: 'password123' })
        .expect(400);

      assertErrorResponse(res, 'VALIDATION_ERROR', 400);
    });

    it('returns 400 for short password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ username: 'newuser', email: 'new@test.com', password: '123' })
        .expect(400);

      assertErrorResponse(res, 'VALIDATION_ERROR', 400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('logs in user and sets cookie', async () => {
      const passwordHash = await require('bcrypt').hash('password123', 10);
      const mockUser = { id: 'user-1', email: 'test@test.com', passwordHash };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: 'password123' })
        .expect(200);

      expect(res.body).toMatchObject({ email: 'test@test.com' });
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('returns 401 for wrong password', async () => {
      const passwordHash = await require('bcrypt').hash('correct', 10);
      const mockUser = { id: 'user-1', email: 'test@test.com', passwordHash };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: 'wrong' })
        .expect(401);

      assertErrorResponse(res, 'UNAUTHORIZED', 401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('clears cookie', async () => {
      const res = await request(app).post('/api/auth/logout').expect(200);
      expect(res.body.message).toBe('Logged out successfully.');
      expect(res.headers['set-cookie'][0]).toContain('token=');
      expect(res.headers['set-cookie'][0]).toContain('Expires=');
    });
  });

  describe('POST /api/auth/ws-ticket', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).post('/api/auth/ws-ticket').expect(401);
      assertErrorResponse(res, 'UNAUTHORIZED', 401);
    });

    it('issues ticket for authenticated user', async () => {
      const passwordHash = await require('bcrypt').hash('password123', 10);
      const mockUser = { id: 'user-1', email: 'test@test.com', passwordHash };
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      // Login first to get cookie
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@test.com', password: 'password123' })
        .expect(200);

      const cookie = loginRes.headers['set-cookie'][0].split(';')[0];
      const [cookieName, cookieValue] = cookie.split('=');

      const res = await request(app)
        .post('/api/auth/ws-ticket')
        .set('Cookie', `${cookieName}=${cookieValue}`)
        .expect(200);

      expect(res.body.ticket).toBeDefined();
    });
  });

  describe('GET /api/auth/verify-email', () => {
    it('returns 400 for missing token', async () => {
      const res = await request(app).get('/api/auth/verify-email').expect(400);
      assertErrorResponse(res, 'INVALID_TOKEN', 400);
    });

    it('returns 400 for invalid token', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const res = await request(app)
        .get('/api/auth/verify-email')
        .query({ token: 'invalid-token' })
        .expect(400);

      assertErrorResponse(res, 'INVALID_TOKEN', 400);
    });
  });

  describe('POST /api/auth/resend-verification', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).post('/api/auth/resend-verification').expect(401);
      assertErrorResponse(res, 'UNAUTHORIZED', 401);
    });
  });
});