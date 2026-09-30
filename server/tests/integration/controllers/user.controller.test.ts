import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createApp } from '@/app';
import request from 'supertest';
import { mockPrisma } from '@/../tests/mocks/prisma-client';
import { mockNodemailer } from '@/../tests/mocks/nodemailer';
import { createTestUser, clearTestCounters } from '@/../tests/utils/factories';
import {
  registerUser,
  loginUser,
  getAuthAgent,
  clearEmailMock,
  getSentEmails,
  assertErrorResponse,
  RegisteredUser,
} from '@/../tests/utils/auth-helpers';

const app = createApp();

describe('User Controller Integration', () => {
  let user: RegisteredUser;

  beforeEach(() => {
    vi.clearAllMocks();
    clearTestCounters();
    clearEmailMock();
    mockPrisma.$transaction.mockImplementation(async (fn) => fn(mockPrisma));
    // Default mock for roomRepository.getRoomsForUser
    mockPrisma.roomMember.findMany.mockResolvedValue([]);
  });

  async function setupUser(options: { emailVerified?: boolean } = {}): Promise<RegisteredUser> {
    // Mock the registration flow - use emailVerified: false so verification email is sent
    const mockUser = {
      id: 'user-1',
      username: 'testuser',
      email: 'test@test.com',
      passwordHash: await require('bcrypt').hash('password123', 10),
      emailVerified: options.emailVerified ?? false,
      emailVerificationToken: null,
      emailVerificationExpiresAt: null,
      pendingEmail: null,
      avatarUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      roomMemberships: [],
      messages: [],
    };
    
    // Mock for registration (username/email checks return null, ID check returns user)
    mockPrisma.user.findUnique.mockImplementation(async ({ where }: { where: { username?: string; email?: string; id?: string } }) => {
      if (where.username || where.email) return null;
      if (where.id === 'user-1') return mockUser;
      return null;
    });
    mockPrisma.user.create.mockResolvedValue(mockUser);
    const mockUserWithToken = { ...mockUser, emailVerificationToken: 'token-123', emailVerificationExpiresAt: new Date(Date.now() + 86400000) };
    mockPrisma.user.update.mockResolvedValue(mockUserWithToken);

    const registeredUser = await registerUser(app, 'testuser', 'test@test.com', 'password123');
    
    // Clear emails sent during registration
    clearEmailMock();
    
    // Now update mocks for subsequent calls (user is now verified)
    const verifiedUser = { ...mockUser, emailVerified: true, emailVerificationToken: null, emailVerificationExpiresAt: null };
    mockPrisma.user.findUnique.mockImplementation(async ({ where }: { where: { username?: string; email?: string; id?: string } }) => {
      if (where.id === 'user-1') return verifiedUser;
      if (where.username === 'newusername') return null;
      if (where.username === 'taken') return { id: 'user-2', username: 'taken' };
      if (where.email === 'new@test.com') return null;
      if (where.email === 'taken@test.com') return { id: 'user-2', email: 'taken@test.com' };
      return null;
    });
    mockPrisma.user.update.mockResolvedValue(verifiedUser);
    
    return registeredUser;
  }

  describe('GET /api/users/me', () => {
    it('returns current user profile', async () => {
      user = await setupUser();

      const res = await getAuthAgent(app, user.cookie).get('/api/users/me').expect(200);

      expect(res.body).toMatchObject({
        id: 'user-1',
        username: 'testuser',
        email: 'test@test.com',
        emailVerified: true,
        avatarUrl: null,
      });
    });

    it('returns 401 UNAUTHORIZED without auth cookie', async () => {
      const res = await request(app).get('/api/users/me').expect(401);

      assertErrorResponse(res, 'UNAUTHORIZED', 401);
    });

    it('returns 401 UNAUTHORIZED with invalid token', async () => {
      const res = await request(app).get('/api/users/me').set('Cookie', 'token=invalid').expect(401);

      assertErrorResponse(res, 'UNAUTHORIZED', 401);
    });
  });

  describe('PATCH /api/users/me', () => {
    it('updates username successfully', async () => {
      user = await setupUser();
      const updatedUser = { 
        id: 'user-1', 
        username: 'newusername', 
        email: 'test@test.com', 
        emailVerified: true,
        avatarUrl: null,
        pendingEmail: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.user.update.mockResolvedValue(updatedUser);
      // Mock getUserById and getUserByUsername
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ id: 'user-1', username: 'testuser', email: 'test@test.com', emailVerified: true }) // getUserById
        .mockResolvedValueOnce(null); // getUserByUsername (no conflict)

      const res = await getAuthAgent(app, user.cookie)
        .patch('/api/users/me')
        .send({ username: 'newusername' })
        .expect(200);

      expect(res.body.username).toBe('newusername');
    });

    it('updates avatarUrl successfully', async () => {
      user = await setupUser();
      const updatedUser = { ...user, avatarUrl: 'https://example.com/avatar.png', id: 'user-1' };
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const res = await getAuthAgent(app, user.cookie)
        .patch('/api/users/me')
        .send({ avatarUrl: 'https://example.com/avatar.png' })
        .expect(200);

      expect(res.body.avatarUrl).toBe('https://example.com/avatar.png');
    });

    it('returns 400 VALIDATION_ERROR for empty body', async () => {
      user = await setupUser();

      const res = await getAuthAgent(app, user.cookie)
        .patch('/api/users/me')
        .send({})
        .expect(400);

      assertErrorResponse(res, 'VALIDATION_ERROR', 400);
    });

    it('returns 409 CONFLICT for duplicate username', async () => {
      user = await setupUser();

      const res = await getAuthAgent(app, user.cookie)
        .patch('/api/users/me')
        .send({ username: 'taken' })
        .expect(409);

      assertErrorResponse(res, 'CONFLICT', 409);
    });

    it('returns 400 VALIDATION_ERROR for invalid username format', async () => {
      user = await setupUser();

      const res = await getAuthAgent(app, user.cookie)
        .patch('/api/users/me')
        .send({ username: 'ab' })
        .expect(400);

      assertErrorResponse(res, 'VALIDATION_ERROR', 400);
    });

    it('returns 400 VALIDATION_ERROR for invalid avatarUrl format', async () => {
      user = await setupUser();

      const res = await getAuthAgent(app, user.cookie)
        .patch('/api/users/me')
        .send({ avatarUrl: 'not-a-url' })
        .expect(400);

      assertErrorResponse(res, 'VALIDATION_ERROR', 400);
    });

    it('returns 401 UNAUTHORIZED without auth cookie', async () => {
      const res = await request(app).patch('/api/users/me').send({ username: 'new' }).expect(401);

      assertErrorResponse(res, 'UNAUTHORIZED', 401);
    });
  });

  describe('PATCH /api/users/me/password', () => {
    it('changes password successfully', async () => {
      user = await setupUser();
      const passwordHash = await require('bcrypt').hash('newpassword123', 10);
      const updatedUser = { ...user, passwordHash, id: 'user-1' };
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const res = await getAuthAgent(app, user.cookie)
        .patch('/api/users/me/password')
        .send({ oldPassword: 'password123', newPassword: 'newpassword123' })
        .expect(200);

      expect(res.body.message).toBe('Password changed successfully.');
    });

    it('returns 401 UNAUTHORIZED for wrong old password', async () => {
      user = await setupUser();

      const res = await getAuthAgent(app, user.cookie)
        .patch('/api/users/me/password')
        .send({ oldPassword: 'wrong', newPassword: 'newpassword123' })
        .expect(401);

      assertErrorResponse(res, 'UNAUTHORIZED', 401);
    });

    it('returns 400 VALIDATION_ERROR for missing oldPassword', async () => {
      user = await setupUser();

      const res = await getAuthAgent(app, user.cookie)
        .patch('/api/users/me/password')
        .send({ newPassword: 'newpassword123' })
        .expect(400);

      assertErrorResponse(res, 'VALIDATION_ERROR', 400);
    });

    it('returns 400 VALIDATION_ERROR for missing newPassword', async () => {
      user = await setupUser();

      const res = await getAuthAgent(app, user.cookie)
        .patch('/api/users/me/password')
        .send({ oldPassword: 'password123' })
        .expect(400);

      assertErrorResponse(res, 'VALIDATION_ERROR', 400);
    });

    it('returns 400 VALIDATION_ERROR for short newPassword', async () => {
      user = await setupUser();

      const res = await getAuthAgent(app, user.cookie)
        .patch('/api/users/me/password')
        .send({ oldPassword: 'password123', newPassword: '123' })
        .expect(400);

      assertErrorResponse(res, 'VALIDATION_ERROR', 400);
    });

    it('returns 401 UNAUTHORIZED without auth cookie', async () => {
      const res = await request(app)
        .patch('/api/users/me/password')
        .send({ oldPassword: 'password123', newPassword: 'newpassword123' })
        .expect(401);

      assertErrorResponse(res, 'UNAUTHORIZED', 401);
    });
  });

  describe('POST /api/users/me/change-email', () => {
    it('requests email change successfully', async () => {
      user = await setupUser();
      const updatedUser = { id: 'user-1', username: 'testuser', email: 'test@test.com', pendingEmail: 'new@test.com', emailVerified: false };
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const res = await getAuthAgent(app, user.cookie)
        .post('/api/users/me/change-email')
        .send({ newEmail: 'new@test.com' })
        .expect(200);

      expect(res.body.message).toBe('Verification email sent to new address.');

      const emails = getSentEmails();
      expect(emails).toHaveLength(1);
      expect(emails[0].to).toBe('new@test.com');
    });

    it('returns 400 VALIDATION_ERROR for missing newEmail', async () => {
      user = await setupUser();

      const res = await getAuthAgent(app, user.cookie)
        .post('/api/users/me/change-email')
        .send({})
        .expect(400);

      assertErrorResponse(res, 'VALIDATION_ERROR', 400);
    });

    it('returns 400 VALIDATION_ERROR for invalid email format', async () => {
      user = await setupUser();

      const res = await getAuthAgent(app, user.cookie)
        .post('/api/users/me/change-email')
        .send({ newEmail: 'invalid' })
        .expect(400);

      assertErrorResponse(res, 'VALIDATION_ERROR', 400);
    });

    it('returns 409 CONFLICT if new email already in use', async () => {
      user = await setupUser();

      const res = await getAuthAgent(app, user.cookie)
        .post('/api/users/me/change-email')
        .send({ newEmail: 'taken@test.com' })
        .expect(409);

      assertErrorResponse(res, 'CONFLICT', 409);
    });

    it('returns 401 UNAUTHORIZED without auth cookie', async () => {
      const res = await request(app)
        .post('/api/users/me/change-email')
        .send({ newEmail: 'new@test.com' })
        .expect(401);

      assertErrorResponse(res, 'UNAUTHORIZED', 401);
    });
  });
});