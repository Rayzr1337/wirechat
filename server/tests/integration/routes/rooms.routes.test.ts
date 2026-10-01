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

describe('Rooms Routes Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearTestCounters();
    clearEmailMock();
    mockPrisma.$transaction.mockImplementation(async (fn) => fn(mockPrisma));
    mockPrisma.roomMember.findMany.mockResolvedValue([]);
    mockPrisma.message.findMany.mockResolvedValue([]);
  });

  async function setupUsers(): Promise<{ user: string; otherUser: string }> {
    const passwordHash = await require('bcrypt').hash('password123', 10);

    const user1 = {
      id: '11111111-1111-4111-8111-111111111111',
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
      id: '22222222-2222-4222-8222-222222222222',
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
      if (where.id === user1.id) return user1;
      if (where.id === user2.id) return user2;
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

    const { cookie: cookie1 } = await registerUser(app, 'user1', 'user1@test.com', 'password123');
    const { cookie: cookie2 } = await registerUser(app, 'user2', 'user2@test.com', 'password123');

    clearEmailMock();

    const verifiedUser1 = { ...user1, emailVerified: true, emailVerificationToken: null, emailVerificationExpiresAt: null };
    const verifiedUser2 = { ...user2, emailVerified: true, emailVerificationToken: null, emailVerificationExpiresAt: null };

    mockPrisma.user.findUnique.mockImplementation(async ({ where }: { where: { username?: string; email?: string; id?: string } }) => {
      if (where.id === user1.id) return verifiedUser1;
      if (where.id === user2.id) return verifiedUser2;
      return null;
    });
    mockPrisma.user.update.mockResolvedValue(verifiedUser1);

    return { user: cookie1, otherUser: cookie2 };
  }

  const ROOM_1_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const ROOM_2_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

  const groupRoom = {
    id: ROOM_1_ID,
    type: 'GROUP',
    name: 'Test Room',
    directKey: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const directRoom = {
    id: ROOM_2_ID,
    type: 'DIRECT',
    name: null,
    directKey: '11111111-1111-4111-8111-111111111111_22222222-2222-4222-8222-222222222222',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const ownerMembership = { id: 'member-1', roomId: ROOM_1_ID, userId: '11111111-1111-4111-8111-111111111111', role: 'OWNER', joinedAt: new Date() };
  const memberMembership = { id: 'member-2', roomId: ROOM_1_ID, userId: '22222222-2222-4222-8222-222222222222', role: 'MEMBER', joinedAt: new Date() };

  describe('GET /api/rooms/me', () => {
    it('returns user rooms', async () => {
      const { user } = await setupUsers();
      mockPrisma.roomMember.findMany.mockResolvedValue([
        { ...ownerMembership, room: groupRoom },
      ]);

      const res = await getAuthAgent(app, user).get('/api/rooms/me').expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({ id: ROOM_1_ID, name: 'Test Room', type: 'GROUP' });
    });

    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/rooms/me').expect(401);
      assertErrorResponse(res, 'UNAUTHORIZED', 401);
    });
  });

  describe('GET /api/rooms/:id', () => {
    it('returns room by id', async () => {
      const { user } = await setupUsers();
      mockPrisma.room.findUnique.mockResolvedValue(groupRoom);

      const res = await getAuthAgent(app, user).get(`/api/rooms/${ROOM_1_ID}`).expect(200);

      expect(res.body).toMatchObject({ id: ROOM_1_ID, name: 'Test Room', type: 'GROUP' });
    });

    it('returns 404 for non-existent room', async () => {
      const { user } = await setupUsers();
      mockPrisma.room.findUnique.mockResolvedValue(null);

      const res = await getAuthAgent(app, user).get('/api/rooms/ffffffff-ffff-4fff-8fff-ffffffffffff').expect(404);
      assertErrorResponse(res, 'ROOM_NOT_FOUND', 404);
    });
  });

  describe('GET /api/rooms/:id/members', () => {
    it('returns room members', async () => {
      const { user } = await setupUsers();
      mockPrisma.room.findUnique.mockResolvedValue(groupRoom);
      mockPrisma.roomMember.findMany.mockResolvedValue([ownerMembership, memberMembership]);

      const res = await getAuthAgent(app, user).get(`/api/rooms/${ROOM_1_ID}/members`).expect(200);

      expect(res.body).toHaveLength(2);
    });
  });

  describe('POST /api/rooms', () => {
    it('creates group room', async () => {
      const { user } = await setupUsers();
      const newRoom = { ...groupRoom, id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', name: 'New Room' };
      mockPrisma.room.create.mockResolvedValue(newRoom);
      mockPrisma.roomMember.create.mockResolvedValue(ownerMembership);

      const res = await getAuthAgent(app, user)
        .post('/api/rooms')
        .send({ roomName: 'New Room' })
        .expect(201);

      expect(res.body.room).toMatchObject({ id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', name: 'New Room', type: 'GROUP' });
    });

    it('returns 400 for missing roomName', async () => {
      const { user } = await setupUsers();

      const res = await getAuthAgent(app, user)
        .post('/api/rooms')
        .send({})
        .expect(400);

      assertErrorResponse(res, 'VALIDATION_ERROR', 400);
    });
  });

  describe('POST /api/rooms/direct', () => {
    it('creates direct room', async () => {
      const { user, otherUser } = await setupUsers();
      mockPrisma.room.findUnique.mockResolvedValue(null);
      mockPrisma.room.create.mockResolvedValue(directRoom);
      mockPrisma.roomMember.create.mockResolvedValue({} as any);

      const res = await getAuthAgent(app, user)
        .post('/api/rooms/direct')
        .send({ targetUserId: '22222222-2222-4222-8222-222222222222' })
        .expect(201);

      expect(res.body.room).toMatchObject({ id: ROOM_2_ID, type: 'DIRECT' });
    });

    it('returns 400 for self direct room', async () => {
      const { user } = await setupUsers();

      const res = await getAuthAgent(app, user)
        .post('/api/rooms/direct')
        .send({ targetUserId: '11111111-1111-4111-8111-111111111111' })
        .expect(400);

      assertErrorResponse(res, 'CANNOT_CREATE_DIRECT_ROOM_WITH_SELF', 400);
    });
  });

  describe('POST /api/rooms/:id/join', () => {
    it('joins group room', async () => {
      const { user } = await setupUsers();
      mockPrisma.room.findUnique.mockResolvedValue(groupRoom);
      mockPrisma.roomMember.findUnique.mockResolvedValue(null);
      mockPrisma.roomMember.create.mockResolvedValue(memberMembership);

      const res = await getAuthAgent(app, user)
        .post(`/api/rooms/${ROOM_1_ID}/join`)
        .expect(200);

      expect(res.body.message).toBe('Joined room successfully');
    });

    it('returns 400 for direct room', async () => {
      const { user } = await setupUsers();
      mockPrisma.room.findUnique.mockResolvedValue(directRoom);

      const res = await getAuthAgent(app, user)
        .post(`/api/rooms/${ROOM_2_ID}/join`)
        .expect(400);

      assertErrorResponse(res, 'CANNOT_JOIN_DIRECT_ROOM', 400);
    });
  });

  describe('POST /api/rooms/:id/leave', () => {
    it('leaves group room', async () => {
      const { user } = await setupUsers();
      mockPrisma.room.findUnique.mockResolvedValue(groupRoom);
      mockPrisma.roomMember.findUnique.mockResolvedValue(memberMembership);
      mockPrisma.roomMember.findMany.mockResolvedValue([ownerMembership, memberMembership]);
      mockPrisma.roomMember.delete.mockResolvedValue(memberMembership);

      const res = await getAuthAgent(app, user)
        .post(`/api/rooms/${ROOM_1_ID}/leave`)
        .expect(200);

      expect(res.body.message).toBe('Left room successfully');
    });
  });

  describe('POST /api/rooms/:id/transfer-ownership', () => {
    it('transfers ownership', async () => {
      const { user } = await setupUsers();
      mockPrisma.room.findUnique.mockResolvedValue(groupRoom);
      mockPrisma.roomMember.findMany.mockResolvedValue([ownerMembership, memberMembership]);
      mockPrisma.roomMember.update.mockResolvedValue({ ...memberMembership, role: 'OWNER' });

      const res = await getAuthAgent(app, user)
        .post(`/api/rooms/${ROOM_1_ID}/transfer-ownership`)
        .send({ newOwnerId: '22222222-2222-4222-8222-222222222222' })
        .expect(200);

      expect(res.body.message).toBe('Ownership transferred successfully');
    });
  });

  describe('POST /api/rooms/:id/promote', () => {
    it('promotes member', async () => {
      const { user } = await setupUsers();
      mockPrisma.room.findUnique.mockResolvedValue(groupRoom);
      mockPrisma.roomMember.findMany.mockResolvedValue([ownerMembership, memberMembership]);
      mockPrisma.roomMember.update.mockResolvedValue({ ...memberMembership, role: 'ADMIN' });

      const res = await getAuthAgent(app, user)
        .post(`/api/rooms/${ROOM_1_ID}/promote`)
        .send({ memberId: '22222222-2222-4222-8222-222222222222' })
        .expect(200);

      expect(res.body.message).toBe('Member promoted successfully');
    });
  });

  describe('POST /api/rooms/:id/demote', () => {
    it('demotes admin', async () => {
      const { user } = await setupUsers();
      const adminMembership = { ...memberMembership, role: 'ADMIN' };
      mockPrisma.room.findUnique.mockResolvedValue(groupRoom);
      mockPrisma.roomMember.findMany.mockResolvedValue([ownerMembership, adminMembership]);
      mockPrisma.roomMember.update.mockResolvedValue({ ...adminMembership, role: 'MEMBER' });

      const res = await getAuthAgent(app, user)
        .post(`/api/rooms/${ROOM_1_ID}/demote`)
        .send({ adminId: '22222222-2222-4222-8222-222222222222' })
        .expect(200);

      expect(res.body.message).toBe('Member demoted successfully');
    });
  });

  describe('POST /api/rooms/:id/kick', () => {
    it('kicks member', async () => {
      const { user } = await setupUsers();
      mockPrisma.room.findUnique.mockResolvedValue(groupRoom);
      mockPrisma.roomMember.findMany.mockResolvedValue([ownerMembership, memberMembership]);
      mockPrisma.roomMember.delete.mockResolvedValue(memberMembership);

      const res = await getAuthAgent(app, user)
        .post(`/api/rooms/${ROOM_1_ID}/kick`)
        .send({ memberId: '22222222-2222-4222-8222-222222222222' })
        .expect(200);

      expect(res.body.message).toBe('Member kicked successfully');
    });
  });
});