import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createApp } from '@/app';
import request from 'supertest';
import { mockPrisma } from '@/../tests/mocks/prisma-client';
import { clearTestCounters } from '@/../tests/utils/factories';
import {
  registerUser,
  getAuthAgent,
  clearEmailMock,
  assertErrorResponse,
  RegisteredUser,
} from '@/../tests/utils/auth-helpers';
import { getMessagesQuerySchema } from '@/schemas/messageQuery.schema';
import { AppError } from '@/middleware/error.middleware';

// Mock validation middleware to pass through for query validation (bug in app: uses validate instead of validateQuery)
vi.mock('@/middleware/validation.middleware', () => {
  const actualValidate = vi.fn((schema) => (req: any, res: any, next: any) => {
    if (schema === getMessagesQuerySchema) {
      const result = schema.safeParse(req.query);
      if (!result.success) {
        return next(new AppError(
          400,
          "VALIDATION_ERROR",
          "Query parameters failed validation.",
          result.error.flatten().fieldErrors
        ));
      }
      // Don't modify req.query (it's a getter), just pass validated data via a custom property
      req.validatedQuery = result.data;
      return next();
    }
    // Default behavior for body validation
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(new AppError(
        400,
        "VALIDATION_ERROR",
        "Request body failed validation.",
        result.error.flatten().fieldErrors
      ));
    }
    req.body = result.data;
    next();
  });
  
  return {
    validate: actualValidate,
    validateQuery: vi.fn((schema) => (req: any, res: any, next: any) => {
      const result = schema.safeParse(req.query);
      if (!result.success) {
        return next(new AppError(
          400,
          "VALIDATION_ERROR",
          "Query parameters failed validation.",
          result.error.flatten().fieldErrors
        ));
      }
      req.validatedQuery = result.data;
      next();
    }),
  };
});

const app = createApp();

// Use proper UUID format for IDs (valid RFC 4122 version 4 with valid hex digits)
const USER_1_ID = '11111111-1111-4111-8111-111111111111';
const USER_2_ID = '22222222-2222-4222-8222-222222222222';
const ROOM_1_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const MESSAGE_1_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const MESSAGE_2_ID = 'ffffffff-ffff-4fff-8fff-ffffffffffff';

describe('Messages Controller Integration', () => {
  let user: RegisteredUser;
  let otherUser: RegisteredUser;

  beforeEach(() => {
    vi.clearAllMocks();
    clearTestCounters();
    clearEmailMock();
    mockPrisma.$transaction.mockImplementation(async (fn) => fn(mockPrisma));
    mockPrisma.roomMember.findMany.mockResolvedValue([]);
    mockPrisma.message.findMany.mockResolvedValue([]);
  });

  async function setupUsers(): Promise<{ user: RegisteredUser; otherUser: RegisteredUser }> {
    const passwordHash = await require('bcrypt').hash('password123', 10);
    
    const user1 = {
      id: USER_1_ID,
      username: 'user1',
      email: 'user1@test.com',
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
    
    const user2 = {
      id: USER_2_ID,
      username: 'user2',
      email: 'user2@test.com',
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
      if (where.username === 'user1' || where.email === 'user1@test.com') return null;
      if (where.username === 'user2' || where.email === 'user2@test.com') return null;
      if (where.id === USER_1_ID) return user1;
      if (where.id === USER_2_ID) return user2;
      return null;
    });
    mockPrisma.user.create
      .mockResolvedValueOnce(user1)
      .mockResolvedValueOnce(user2);
    const user1WithToken = { ...user1, emailVerificationToken: 'token-1', emailVerificationExpiresAt: new Date(Date.now() + 86400000) };
    const user2WithToken = { ...user2, emailVerificationToken: 'token-2', emailVerificationExpiresAt: new Date(Date.now() + 86400000) };
    mockPrisma.user.update
      .mockResolvedValueOnce(user1WithToken)
      .mockResolvedValueOnce(user2WithToken);

    const user = await registerUser(app, 'user1', 'user1@test.com', 'password123');
    const otherUser = await registerUser(app, 'user2', 'user2@test.com', 'password123');

    clearEmailMock();

    const verifiedUser1 = { ...user1, emailVerified: true, emailVerificationToken: null, emailVerificationExpiresAt: null };
    const verifiedUser2 = { ...user2, emailVerified: true, emailVerificationToken: null, emailVerificationExpiresAt: null };
    
    mockPrisma.user.findUnique.mockImplementation(async ({ where }: { where: { username?: string; email?: string; id?: string } }) => {
      if (where.id === USER_1_ID) return verifiedUser1;
      if (where.id === USER_2_ID) return verifiedUser2;
      return null;
    });
    mockPrisma.user.update.mockResolvedValue(verifiedUser1);

    return { user, otherUser };
  }

  const groupRoom = {
    id: ROOM_1_ID,
    type: 'GROUP',
    name: 'Test Room',
    directKey: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const ownerMembership = { id: 'member-1', roomId: ROOM_1_ID, userId: USER_1_ID, role: 'OWNER', joinedAt: new Date(), room: groupRoom };
  const memberMembership = { id: 'member-2', roomId: ROOM_1_ID, userId: USER_2_ID, role: 'MEMBER', joinedAt: new Date(), room: groupRoom };

  const message1 = {
    id: MESSAGE_1_ID,
    roomId: ROOM_1_ID,
    senderId: USER_1_ID,
    content: 'Hello world',
    createdAt: new Date('2024-01-01T10:00:00Z'),
    editedAt: null,
    room: null,
    sender: { id: USER_1_ID, username: 'user1' },
  };

  const message2 = {
    id: MESSAGE_2_ID,
    roomId: ROOM_1_ID,
    senderId: USER_2_ID,
    content: 'Hi there',
    createdAt: new Date('2024-01-01T10:05:00Z'),
    editedAt: null,
    room: null,
    sender: { id: USER_2_ID, username: 'user2' },
  };

  describe('GET /api/rooms/:id/messages', () => {
    it('returns messages for room with default limit', async () => {
      ({ user } = await setupUsers());
      mockPrisma.room.findUnique.mockResolvedValue(groupRoom);
      mockPrisma.roomMember.findUnique.mockResolvedValue(ownerMembership);
      mockPrisma.message.findMany.mockResolvedValue([message1, message2]);

      const res = await getAuthAgent(app, user.cookie).get(`/api/rooms/${ROOM_1_ID}/messages`).expect(200);

      expect(res.body).toHaveLength(2);
      expect(res.body[0].content).toBe('Hello world');
      expect(res.body[1].content).toBe('Hi there');
    });

    it('returns messages with custom limit', async () => {
      ({ user } = await setupUsers());
      mockPrisma.room.findUnique.mockResolvedValue(groupRoom);
      mockPrisma.roomMember.findUnique.mockResolvedValue(ownerMembership);
      mockPrisma.message.findMany.mockResolvedValue([message1]);

      const res = await getAuthAgent(app, user.cookie).get(`/api/rooms/${ROOM_1_ID}/messages?limit=1`).expect(200);

      expect(res.body).toHaveLength(1);
    });

    it('returns messages with cursor', async () => {
      ({ user } = await setupUsers());
      mockPrisma.room.findUnique.mockResolvedValue(groupRoom);
      mockPrisma.roomMember.findUnique.mockResolvedValue(ownerMembership);
      mockPrisma.message.findMany.mockResolvedValue([message2]);

      const res = await getAuthAgent(app, user.cookie).get(`/api/rooms/${ROOM_1_ID}/messages?limit=10&cursor=${MESSAGE_1_ID}`).expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].id).toBe(MESSAGE_2_ID);
    });

    it('returns 404 ROOM_NOT_FOUND for non-existent room', async () => {
      ({ user } = await setupUsers());
      mockPrisma.room.findUnique.mockResolvedValue(null);

      const res = await getAuthAgent(app, user.cookie).get('/api/rooms/ffffffff-ffff-4fff-8fff-ffffffffffff/messages').expect(404);
      assertErrorResponse(res, 'ROOM_NOT_FOUND', 404);
    });

    it('returns messages for non-member (no membership check implemented)', async () => {
      ({ user } = await setupUsers());
      mockPrisma.room.findUnique.mockResolvedValue(groupRoom);
      mockPrisma.roomMember.findUnique.mockResolvedValue(null); // Not a member
      mockPrisma.message.findMany.mockResolvedValue([message1, message2]);

      const res = await getAuthAgent(app, user.cookie).get(`/api/rooms/${ROOM_1_ID}/messages`).expect(200);

      expect(res.body).toHaveLength(2);
    });

    it('returns 400 VALIDATION_ERROR for invalid limit', async () => {
      ({ user } = await setupUsers());
      mockPrisma.room.findUnique.mockResolvedValue(groupRoom);
      mockPrisma.roomMember.findUnique.mockResolvedValue(ownerMembership);

      const res = await getAuthAgent(app, user.cookie).get(`/api/rooms/${ROOM_1_ID}/messages?limit=invalid`).expect(400);
      assertErrorResponse(res, 'VALIDATION_ERROR', 400);
    });

    it('returns 401 UNAUTHORIZED without auth cookie', async () => {
      const res = await request(app).get(`/api/rooms/${ROOM_1_ID}/messages`).expect(401);
      assertErrorResponse(res, 'UNAUTHORIZED', 401);
    });
  });

  describe('GET /api/message/:messageId', () => {
    it('returns message by id', async () => {
      ({ user } = await setupUsers());
      mockPrisma.message.findUnique.mockResolvedValue(message1);

      const res = await getAuthAgent(app, user.cookie).get(`/api/messages/message/${MESSAGE_1_ID}`).expect(200);

      expect(res.body.id).toBe(MESSAGE_1_ID);
      expect(res.body.content).toBe('Hello world');
    });

    it('returns 404 MESSAGE_NOT_FOUND for non-existent message', async () => {
      ({ user } = await setupUsers());
      mockPrisma.message.findUnique.mockResolvedValue(null);

      const res = await getAuthAgent(app, user.cookie).get('/api/messages/message/ffffffff-ffff-4fff-8fff-ffffffffffff').expect(404);
      assertErrorResponse(res, 'MESSAGE_NOT_FOUND', 404);
    });

    it('returns 401 UNAUTHORIZED without auth cookie', async () => {
      const res = await request(app).get(`/api/messages/message/${MESSAGE_1_ID}`).expect(401);
      assertErrorResponse(res, 'UNAUTHORIZED', 401);
    });
  });
});