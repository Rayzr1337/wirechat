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
  getSentEmails,
  assertErrorResponse,
  RegisteredUser,
} from '@/../tests/utils/auth-helpers';

const app = createApp();

// Use proper UUID format for IDs (valid RFC 4122 version 4)
const USER_1_ID = '11111111-1111-4111-8111-111111111111';
const USER_2_ID = '22222222-2222-4222-8222-222222222222';
const USER_3_ID = '33333333-3333-4333-8333-333333333333';
const ROOM_1_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ROOM_2_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const ROOM_NEW_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const MEMBER_1_ID = 'mmmmmmmm-mmmm-4mmm-8mmm-mmmmmmmmmmm1';
const MEMBER_2_ID = 'mmmmmmmm-mmmm-4mmm-8mmm-mmmmmmmmmmm2';
const MEMBER_3_ID = 'mmmmmmmm-mmmm-4mmm-8mmm-mmmmmmmmmmm3';

describe('Rooms Controller Integration', () => {
  let user: RegisteredUser;
  let otherUser: RegisteredUser;

  beforeEach(() => {
    vi.clearAllMocks();
    clearTestCounters();
    clearEmailMock();
    mockPrisma.$transaction.mockImplementation(async (fn) => fn(mockPrisma));
    // Default mocks
    mockPrisma.roomMember.findMany.mockResolvedValue([]);
    mockPrisma.message.findMany.mockResolvedValue([]);
  });

  async function setupUsers(): Promise<{ user: RegisteredUser; otherUser: RegisteredUser }> {
    const passwordHash = await require('bcrypt').hash('password123', 10);
    
    // Mock for first user registration
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
    
    // Mock for second user registration
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

    // Registration mocks
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

    // Verified user mocks for subsequent calls
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

  const directRoom = {
    id: ROOM_2_ID,
    type: 'DIRECT',
    name: null,
    directKey: `${USER_1_ID}_${USER_2_ID}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const ownerMembership = { id: MEMBER_1_ID, roomId: ROOM_1_ID, userId: USER_1_ID, role: 'OWNER', joinedAt: new Date(), room: groupRoom };
  const memberMembership = { id: MEMBER_2_ID, roomId: ROOM_1_ID, userId: USER_2_ID, role: 'MEMBER', joinedAt: new Date(), room: groupRoom };
  const adminMembership = { id: MEMBER_3_ID, roomId: ROOM_1_ID, userId: USER_3_ID, role: 'ADMIN', joinedAt: new Date(), room: groupRoom };

  describe('GET /api/rooms/me', () => {
    it('returns user rooms', async () => {
      ({ user } = await setupUsers());
      mockPrisma.roomMember.findMany.mockResolvedValue([
        { ...ownerMembership, room: groupRoom },
      ]);

      const res = await getAuthAgent(app, user.cookie).get('/api/rooms/me').expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({
        id: ROOM_1_ID,
        name: 'Test Room',
        type: 'GROUP',
        myRole: 'OWNER',
      });
    });

    it('returns 401 UNAUTHORIZED without auth cookie', async () => {
      const res = await request(app).get('/api/rooms/me').expect(401);
      assertErrorResponse(res, 'UNAUTHORIZED', 401);
    });
  });

  describe('GET /api/rooms/:id', () => {
    it('returns room by id', async () => {
      ({ user } = await setupUsers());
      mockPrisma.room.findUnique.mockResolvedValue(groupRoom);

      const res = await getAuthAgent(app, user.cookie).get(`/api/rooms/${ROOM_1_ID}`).expect(200);

      expect(res.body).toMatchObject({ id: ROOM_1_ID, name: 'Test Room', type: 'GROUP' });
    });

    it('returns 404 ROOM_NOT_FOUND for non-existent room', async () => {
      ({ user } = await setupUsers());
      mockPrisma.room.findUnique.mockResolvedValue(null);

      const res = await getAuthAgent(app, user.cookie).get('/api/rooms/ffffffff-ffff-ffff-ffff-ffffffffffff').expect(404);
      assertErrorResponse(res, 'ROOM_NOT_FOUND', 404);
    });

    it('returns 401 UNAUTHORIZED without auth cookie', async () => {
      const res = await request(app).get('/api/rooms/room-1').expect(401);
      assertErrorResponse(res, 'UNAUTHORIZED', 401);
    });
  });

  describe('GET /api/rooms/:id/members', () => {
    it('returns room members', async () => {
      ({ user } = await setupUsers());
      mockPrisma.room.findUnique.mockResolvedValue(groupRoom);
      mockPrisma.roomMember.findMany.mockResolvedValue([ownerMembership, memberMembership]);

      const res = await getAuthAgent(app, user.cookie).get(`/api/rooms/${ROOM_1_ID}/members`).expect(200);

      expect(res.body).toHaveLength(2);
    });

    it('returns 404 ROOM_NOT_FOUND for non-existent room', async () => {
      ({ user } = await setupUsers());
      mockPrisma.room.findUnique.mockResolvedValue(null);

      const res = await getAuthAgent(app, user.cookie).get('/api/rooms/ffffffff-ffff-ffff-ffff-ffffffffffff/members').expect(404);
      assertErrorResponse(res, 'ROOM_NOT_FOUND', 404);
    });
  });

  describe('POST /api/rooms', () => {
    it('creates group room successfully', async () => {
      ({ user } = await setupUsers());
      const newRoom = { ...groupRoom, id: ROOM_NEW_ID, name: 'New Room' };
      mockPrisma.room.create.mockResolvedValue(newRoom);
      mockPrisma.roomMember.create.mockResolvedValue(ownerMembership);

      const res = await getAuthAgent(app, user.cookie)
        .post('/api/rooms')
        .send({ roomName: 'New Room' })
        .expect(201);

      expect(res.body.room).toMatchObject({ id: ROOM_NEW_ID, name: 'New Room', type: 'GROUP' });
    });

    it('returns 400 VALIDATION_ERROR for missing roomName', async () => {
      ({ user } = await setupUsers());

      const res = await getAuthAgent(app, user.cookie)
        .post('/api/rooms')
        .send({})
        .expect(400);

      assertErrorResponse(res, 'VALIDATION_ERROR', 400);
    });

    it('returns 401 UNAUTHORIZED without auth cookie', async () => {
      const res = await request(app).post('/api/rooms').send({ roomName: 'Test' }).expect(401);
      assertErrorResponse(res, 'UNAUTHORIZED', 401);
    });
  });

  describe('POST /api/rooms/direct', () => {
    it('creates direct room successfully', async () => {
      ({ user, otherUser } = await setupUsers());
      mockPrisma.room.findUnique.mockResolvedValue(null); // No existing direct room
      mockPrisma.room.create.mockResolvedValue(directRoom);
      mockPrisma.roomMember.create.mockResolvedValue({} as any);

      const res = await getAuthAgent(app, user.cookie)
        .post('/api/rooms/direct')
        .send({ targetUserId: USER_2_ID })
        .expect(201);

      expect(res.body.room).toMatchObject({ id: ROOM_2_ID, type: 'DIRECT' });
    });

    it('returns existing direct room if already exists', async () => {
      ({ user, otherUser } = await setupUsers());
      mockPrisma.room.findUnique.mockResolvedValue(directRoom);

      const res = await getAuthAgent(app, user.cookie)
        .post('/api/rooms/direct')
        .send({ targetUserId: USER_2_ID })
        .expect(201);

      expect(res.body.room).toMatchObject({ id: ROOM_2_ID, type: 'DIRECT' });
    });

    it('returns 400 CANNOT_CREATE_DIRECT_ROOM_WITH_SELF for self', async () => {
      ({ user } = await setupUsers());

      const res = await getAuthAgent(app, user.cookie)
        .post('/api/rooms/direct')
        .send({ targetUserId: USER_1_ID })
        .expect(400);

      assertErrorResponse(res, 'CANNOT_CREATE_DIRECT_ROOM_WITH_SELF', 400);
    });

    it('returns 404 USER_NOT_FOUND for non-existent target user', async () => {
      ({ user } = await setupUsers());
      // Override mock to return null for target user
      mockPrisma.user.findUnique.mockImplementation(async ({ where }: { where: { username?: string; email?: string; id?: string } }) => {
        if (where.id === 'ffffffff-ffff-ffff-ffff-ffffffffffff') return null;
        if (where.id === USER_1_ID) return { id: USER_1_ID, username: 'user1', email: 'user1@test.com', emailVerified: true };
        return null;
      });

      const res = await getAuthAgent(app, user.cookie)
        .post('/api/rooms/direct')
        .send({ targetUserId: 'ffffffff-ffff-ffff-ffff-ffffffffffff' })
        .expect(404);

      assertErrorResponse(res, 'USER_NOT_FOUND', 404);
    });

    it('returns 400 VALIDATION_ERROR for missing targetUserId', async () => {
      ({ user } = await setupUsers());

      const res = await getAuthAgent(app, user.cookie)
        .post('/api/rooms/direct')
        .send({})
        .expect(400);

      assertErrorResponse(res, 'VALIDATION_ERROR', 400);
    });
  });

  describe('POST /api/rooms/:id/join', () => {
    it('joins group room successfully', async () => {
      ({ user } = await setupUsers());
      mockPrisma.room.findUnique.mockResolvedValue(groupRoom);
      mockPrisma.roomMember.findUnique.mockResolvedValue(null); // Not a member
      mockPrisma.roomMember.create.mockResolvedValue(memberMembership);

      const res = await getAuthAgent(app, user.cookie)
        .post(`/api/rooms/${ROOM_1_ID}/join`)
        .expect(200);

      expect(res.body.message).toBe('Joined room successfully');
    });

    it('returns 404 ROOM_NOT_FOUND for non-existent room', async () => {
      ({ user } = await setupUsers());
      mockPrisma.room.findUnique.mockResolvedValue(null);

      const res = await getAuthAgent(app, user.cookie)
        .post('/api/rooms/ffffffff-ffff-ffff-ffff-ffffffffffff/join')
        .expect(404);

      assertErrorResponse(res, 'ROOM_NOT_FOUND', 404);
    });

    it('returns 400 CANNOT_JOIN_DIRECT_ROOM for direct room', async () => {
      ({ user } = await setupUsers());
      mockPrisma.room.findUnique.mockResolvedValue(directRoom);

      const res = await getAuthAgent(app, user.cookie)
        .post(`/api/rooms/${ROOM_2_ID}/join`)
        .expect(400);

      assertErrorResponse(res, 'CANNOT_JOIN_DIRECT_ROOM', 400);
    });

    it('returns 400 ALREADY_MEMBER if already member', async () => {
      ({ user } = await setupUsers());
      mockPrisma.room.findUnique.mockResolvedValue(groupRoom);
      mockPrisma.roomMember.findUnique.mockResolvedValue(memberMembership);

      const res = await getAuthAgent(app, user.cookie)
        .post(`/api/rooms/${ROOM_1_ID}/join`)
        .expect(400);

      assertErrorResponse(res, 'ALREADY_MEMBER', 400);
    });

    it('returns 403 EMAIL_NOT_VERIFIED if email not verified', async () => {
      ({ user } = await setupUsers());
      // User with unverified email
      mockPrisma.user.findUnique.mockResolvedValue({ id: USER_1_ID, emailVerified: false });
      mockPrisma.room.findUnique.mockResolvedValue(groupRoom);

      const res = await getAuthAgent(app, user.cookie)
        .post(`/api/rooms/${ROOM_1_ID}/join`)
        .expect(403);

      assertErrorResponse(res, 'EMAIL_NOT_VERIFIED', 403);
    });
  });

  describe('POST /api/rooms/:id/leave', () => {
    it('leaves group room successfully', async () => {
      ({ user } = await setupUsers());
      mockPrisma.room.findUnique.mockResolvedValue(groupRoom);
      mockPrisma.roomMember.findUnique.mockResolvedValue(memberMembership); // Is member
      mockPrisma.roomMember.findMany.mockResolvedValue([ownerMembership, memberMembership]); // Other members exist
      mockPrisma.roomMember.delete.mockResolvedValue(memberMembership);

      const res = await getAuthAgent(app, user.cookie)
        .post(`/api/rooms/${ROOM_1_ID}/leave`)
        .expect(200);

      expect(res.body.message).toBe('Left room successfully');
    });

    it('returns 404 ROOM_NOT_FOUND for non-existent room', async () => {
      ({ user } = await setupUsers());
      mockPrisma.room.findUnique.mockResolvedValue(null);

      const res = await getAuthAgent(app, user.cookie)
        .post('/api/rooms/ffffffff-ffff-ffff-ffff-ffffffffffff/leave')
        .expect(404);

      assertErrorResponse(res, 'ROOM_NOT_FOUND', 404);
    });

    it('returns 400 NOT_IN_ROOM if not a member', async () => {
      ({ user } = await setupUsers());
      mockPrisma.room.findUnique.mockResolvedValue(groupRoom);
      mockPrisma.roomMember.findUnique.mockResolvedValue(null);

      const res = await getAuthAgent(app, user.cookie)
        .post(`/api/rooms/${ROOM_1_ID}/leave`)
        .expect(400);

      assertErrorResponse(res, 'NOT_IN_ROOM', 400);
    });

    it('returns 400 CANNOT_LEAVE_DIRECT_ROOM for direct room', async () => {
      ({ user } = await setupUsers());
      mockPrisma.room.findUnique.mockResolvedValue(directRoom);
      mockPrisma.roomMember.findUnique.mockResolvedValue({ ...memberMembership, roomId: ROOM_2_ID });

      const res = await getAuthAgent(app, user.cookie)
        .post(`/api/rooms/${ROOM_2_ID}/leave`)
        .expect(400);

      assertErrorResponse(res, 'CANNOT_LEAVE_DIRECT_ROOM', 400);
    });
  });

  describe('POST /api/rooms/:id/transfer-ownership', () => {
    it('transfers ownership successfully', async () => {
      ({ user, otherUser } = await setupUsers());
      mockPrisma.room.findUnique.mockResolvedValue(groupRoom);
      mockPrisma.roomMember.findMany.mockResolvedValue([ownerMembership, memberMembership]);
      mockPrisma.roomMember.update.mockResolvedValue({ ...memberMembership, role: 'OWNER' });

      const res = await getAuthAgent(app, user.cookie)
        .post(`/api/rooms/${ROOM_1_ID}/transfer-ownership`)
        .send({ newOwnerId: USER_2_ID })
        .expect(200);

      expect(res.body.message).toBe('Ownership transferred successfully');
    });

    it('returns 404 ROOM_NOT_FOUND for non-existent room', async () => {
      ({ user } = await setupUsers());
      mockPrisma.room.findUnique.mockResolvedValue(null);

      const res = await getAuthAgent(app, user.cookie)
        .post('/api/rooms/ffffffff-ffff-ffff-ffff-ffffffffffff/transfer-ownership')
        .send({ newOwnerId: USER_2_ID })
        .expect(404);

      assertErrorResponse(res, 'ROOM_NOT_FOUND', 404);
    });

    it('returns 400 GROUP_ROOM_REQUIRED for direct room', async () => {
      ({ user } = await setupUsers());
      mockPrisma.room.findUnique.mockResolvedValue(directRoom);

      const res = await getAuthAgent(app, user.cookie)
        .post(`/api/rooms/${ROOM_2_ID}/transfer-ownership`)
        .send({ newOwnerId: USER_2_ID })
        .expect(400);

      assertErrorResponse(res, 'GROUP_ROOM_REQUIRED', 400);
    });

    it('returns 403 OWNER_REQUIRED if not owner', async () => {
      ({ user } = await setupUsers());
      mockPrisma.room.findUnique.mockResolvedValue(groupRoom);
      // User is member, not owner
      const memberMembership2 = { ...memberMembership, userId: USER_1_ID };
      const ownerMembership2 = { ...ownerMembership, userId: USER_2_ID };
      mockPrisma.roomMember.findMany.mockResolvedValue([memberMembership2, ownerMembership2]);

      const res = await getAuthAgent(app, user.cookie)
        .post(`/api/rooms/${ROOM_1_ID}/transfer-ownership`)
        .send({ newOwnerId: USER_2_ID })
        .expect(403);

      assertErrorResponse(res, 'OWNER_REQUIRED', 403);
    });

    it('returns 400 NOT_IN_ROOM if target not in room', async () => {
      ({ user } = await setupUsers());
      mockPrisma.room.findUnique.mockResolvedValue(groupRoom);
      mockPrisma.roomMember.findMany.mockResolvedValue([ownerMembership]); // Only owner in room

      const res = await getAuthAgent(app, user.cookie)
        .post(`/api/rooms/${ROOM_1_ID}/transfer-ownership`)
        .send({ newOwnerId: 'ffffffff-ffff-ffff-ffff-ffffffffffff' })
        .expect(400);

      assertErrorResponse(res, 'NOT_IN_ROOM', 400);
    });

    it('returns 400 CANNOT_TRANSFER_TO_SELF', async () => {
      ({ user } = await setupUsers());
      mockPrisma.room.findUnique.mockResolvedValue(groupRoom);
      mockPrisma.roomMember.findMany.mockResolvedValue([ownerMembership, memberMembership]);

      const res = await getAuthAgent(app, user.cookie)
        .post(`/api/rooms/${ROOM_1_ID}/transfer-ownership`)
        .send({ newOwnerId: USER_1_ID })
        .expect(400);

      assertErrorResponse(res, 'CANNOT_TRANSFER_TO_SELF', 400);
    });

    it('returns 400 VALIDATION_ERROR for missing newOwnerId', async () => {
      ({ user } = await setupUsers());

      const res = await getAuthAgent(app, user.cookie)
        .post(`/api/rooms/${ROOM_1_ID}/transfer-ownership`)
        .send({})
        .expect(400);

      assertErrorResponse(res, 'VALIDATION_ERROR', 400);
    });
  });

  describe('POST /api/rooms/:id/promote', () => {
    it('promotes member to admin successfully', async () => {
      ({ user, otherUser } = await setupUsers());
      mockPrisma.room.findUnique.mockResolvedValue(groupRoom);
      mockPrisma.roomMember.findMany.mockResolvedValue([ownerMembership, memberMembership]);
      mockPrisma.roomMember.update.mockResolvedValue({ ...memberMembership, role: 'ADMIN' });

      const res = await getAuthAgent(app, user.cookie)
        .post(`/api/rooms/${ROOM_1_ID}/promote`)
        .send({ memberId: USER_2_ID })
        .expect(200);

      expect(res.body.message).toBe('Member promoted successfully');
    });

    it('returns 400 CANNOT_PROMOTE_SELF', async () => {
      ({ user } = await setupUsers());
      mockPrisma.room.findUnique.mockResolvedValue(groupRoom);
      mockPrisma.roomMember.findMany.mockResolvedValue([ownerMembership, memberMembership]);

      const res = await getAuthAgent(app, user.cookie)
        .post(`/api/rooms/${ROOM_1_ID}/promote`)
        .send({ memberId: USER_1_ID })
        .expect(400);

      assertErrorResponse(res, 'CANNOT_PROMOTE_SELF', 400);
    });

    it('returns 403 OWNER_REQUIRED if not owner', async () => {
      ({ user } = await setupUsers());
      mockPrisma.room.findUnique.mockResolvedValue(groupRoom);
      mockPrisma.roomMember.findMany.mockResolvedValue([memberMembership, adminMembership]); // User is admin

      const res = await getAuthAgent(app, user.cookie)
        .post(`/api/rooms/${ROOM_1_ID}/promote`)
        .send({ memberId: USER_2_ID })
        .expect(403);

      assertErrorResponse(res, 'OWNER_REQUIRED', 403);
    });

    it('returns 400 ALREADY_ADMIN if already admin', async () => {
      ({ user, otherUser } = await setupUsers());
      mockPrisma.room.findUnique.mockResolvedValue(groupRoom);
      mockPrisma.roomMember.findMany.mockResolvedValue([ownerMembership, adminMembership]);

      const res = await getAuthAgent(app, user.cookie)
        .post(`/api/rooms/${ROOM_1_ID}/promote`)
        .send({ memberId: USER_3_ID })
        .expect(400);

      assertErrorResponse(res, 'ALREADY_ADMIN', 400);
    });

    it('returns 400 VALIDATION_ERROR for missing memberId', async () => {
      ({ user } = await setupUsers());

      const res = await getAuthAgent(app, user.cookie)
        .post(`/api/rooms/${ROOM_1_ID}/promote`)
        .send({})
        .expect(400);

      assertErrorResponse(res, 'VALIDATION_ERROR', 400);
    });
  });

  describe('POST /api/rooms/:id/demote', () => {
    it('demotes admin to member successfully', async () => {
      ({ user, otherUser } = await setupUsers());
      mockPrisma.room.findUnique.mockResolvedValue(groupRoom);
      mockPrisma.roomMember.findMany.mockResolvedValue([ownerMembership, adminMembership]);
      mockPrisma.roomMember.update.mockResolvedValue({ ...adminMembership, role: 'MEMBER' });

      const res = await getAuthAgent(app, user.cookie)
        .post(`/api/rooms/${ROOM_1_ID}/demote`)
        .send({ adminId: USER_3_ID })
        .expect(200);

      expect(res.body.message).toBe('Member demoted successfully');
    });

    it('returns 403 OWNER_REQUIRED if not owner', async () => {
      ({ user } = await setupUsers());
      mockPrisma.room.findUnique.mockResolvedValue(groupRoom);
      mockPrisma.roomMember.findMany.mockResolvedValue([adminMembership, memberMembership]); // User is admin

      const res = await getAuthAgent(app, user.cookie)
        .post(`/api/rooms/${ROOM_1_ID}/demote`)
        .send({ adminId: USER_3_ID })
        .expect(403);

      assertErrorResponse(res, 'OWNER_REQUIRED', 403);
    });

    it('returns 400 NOT_ADMIN if target not admin', async () => {
      ({ user } = await setupUsers());
      mockPrisma.room.findUnique.mockResolvedValue(groupRoom);
      mockPrisma.roomMember.findMany.mockResolvedValue([ownerMembership, memberMembership]);

      const res = await getAuthAgent(app, user.cookie)
        .post(`/api/rooms/${ROOM_1_ID}/demote`)
        .send({ adminId: USER_2_ID })
        .expect(400);

      assertErrorResponse(res, 'NOT_ADMIN', 400);
    });

    it('returns 400 VALIDATION_ERROR for missing adminId', async () => {
      ({ user } = await setupUsers());

      const res = await getAuthAgent(app, user.cookie)
        .post(`/api/rooms/${ROOM_1_ID}/demote`)
        .send({})
        .expect(400);

      assertErrorResponse(res, 'VALIDATION_ERROR', 400);
    });
  });

  describe('POST /api/rooms/:id/kick', () => {
    it('kicks member successfully by owner', async () => {
      ({ user, otherUser } = await setupUsers());
      mockPrisma.room.findUnique.mockResolvedValue(groupRoom);
      mockPrisma.roomMember.findMany.mockResolvedValue([ownerMembership, memberMembership]);
      mockPrisma.roomMember.delete.mockResolvedValue(memberMembership);

      const res = await getAuthAgent(app, user.cookie)
        .post(`/api/rooms/${ROOM_1_ID}/kick`)
        .send({ memberId: USER_2_ID })
        .expect(200);

      expect(res.body.message).toBe('Member kicked successfully');
    });

    it('kicks member successfully by admin', async () => {
      ({ user, otherUser } = await setupUsers());
      // User is admin, other is member
      const adminMembership = { ...ownerMembership, role: 'ADMIN', userId: USER_1_ID };
      const targetMembership = { ...memberMembership, userId: USER_2_ID };
      mockPrisma.room.findUnique.mockResolvedValue(groupRoom);
      mockPrisma.roomMember.findMany.mockResolvedValue([adminMembership, targetMembership]);
      mockPrisma.roomMember.delete.mockResolvedValue(targetMembership);

      const res = await getAuthAgent(app, user.cookie)
        .post(`/api/rooms/${ROOM_1_ID}/kick`)
        .send({ memberId: USER_2_ID })
        .expect(200);

      expect(res.body.message).toBe('Member kicked successfully');
    });

    it('returns 400 CANNOT_KICK_SELF', async () => {
      ({ user } = await setupUsers());
      mockPrisma.room.findUnique.mockResolvedValue(groupRoom);
      mockPrisma.roomMember.findMany.mockResolvedValue([ownerMembership, memberMembership]);

      const res = await getAuthAgent(app, user.cookie)
        .post(`/api/rooms/${ROOM_1_ID}/kick`)
        .send({ memberId: USER_1_ID })
        .expect(400);

      assertErrorResponse(res, 'CANNOT_KICK_SELF', 400);
    });

    it('returns 403 ADMIN_OR_OWNER_REQUIRED if not admin or owner', async () => {
      ({ user } = await setupUsers());
      mockPrisma.room.findUnique.mockResolvedValue(groupRoom);
      // User is member, not admin or owner
      const memberMembership2 = { ...memberMembership, userId: USER_1_ID };
      const ownerMembership2 = { ...ownerMembership, userId: USER_2_ID };
      mockPrisma.roomMember.findMany.mockResolvedValue([memberMembership2, ownerMembership2]);

      const res = await getAuthAgent(app, user.cookie)
        .post(`/api/rooms/${ROOM_1_ID}/kick`)
        .send({ memberId: USER_2_ID })
        .expect(403);

      assertErrorResponse(res, 'ADMIN_OR_OWNER_REQUIRED', 403);
    });

    it('returns 403 CANNOT_KICK_OWNER if target is owner', async () => {
      ({ user, otherUser } = await setupUsers());
      // User is admin, target is owner
      const adminMembership = { ...memberMembership, role: 'ADMIN', userId: USER_1_ID };
      const ownerMembership2 = { ...ownerMembership, userId: USER_2_ID };
      mockPrisma.room.findUnique.mockResolvedValue(groupRoom);
      mockPrisma.roomMember.findMany.mockResolvedValue([adminMembership, ownerMembership2]);

      const res = await getAuthAgent(app, user.cookie)
        .post(`/api/rooms/${ROOM_1_ID}/kick`)
        .send({ memberId: USER_2_ID })
        .expect(403);

      assertErrorResponse(res, 'CANNOT_KICK_OWNER', 403);
    });

    it('returns 403 CANNOT_KICK_ADMIN if admin tries to kick admin', async () => {
      ({ user, otherUser } = await setupUsers());
      const admin1 = { ...ownerMembership, role: 'ADMIN', userId: USER_1_ID };
      const admin2 = { ...memberMembership, role: 'ADMIN', userId: USER_2_ID };
      mockPrisma.room.findUnique.mockResolvedValue(groupRoom);
      mockPrisma.roomMember.findMany.mockResolvedValue([admin1, admin2]);

      const res = await getAuthAgent(app, user.cookie)
        .post(`/api/rooms/${ROOM_1_ID}/kick`)
        .send({ memberId: USER_2_ID })
        .expect(403);

      assertErrorResponse(res, 'CANNOT_KICK_ADMIN', 403);
    });

    it('returns 400 VALIDATION_ERROR for missing memberId', async () => {
      ({ user } = await setupUsers());

      const res = await getAuthAgent(app, user.cookie)
        .post(`/api/rooms/${ROOM_1_ID}/kick`)
        .send({})
        .expect(400);

      assertErrorResponse(res, 'VALIDATION_ERROR', 400);
    });
  });
});