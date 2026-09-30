import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as roomsService from '@/services/rooms.service';
import { roomRepository } from '@/repositories/room.repository';
import { userRepository } from '@/repositories/user.repository';
import { mockPrisma } from '@/../tests/mocks/prisma-client';
import { createTestUser, createTestRoom, clearTestCounters } from '@/../tests/utils/factories';
import { AppError } from '@/middleware/error.middleware';

vi.mock('@/repositories/room.repository');
vi.mock('@/repositories/user.repository');
vi.mock('@/ws/broadcast', () => ({
  broadcastToRoom: vi.fn().mockResolvedValue(undefined),
}));

describe('rooms.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearTestCounters();
    mockPrisma.$transaction.mockImplementation(async (fn) => fn(mockPrisma));
  });

  describe('getUserRooms', () => {
    it('returns rooms for user', async () => {
      const user = createTestUser({ id: 'user-1' });
      const room = createTestRoom({ id: 'room-1', name: 'Test Room' });
      const memberships = [{ room, role: 'MEMBER' }];
      
      vi.mocked(userRepository.getUserById).mockResolvedValue(user);
      vi.mocked(roomRepository.getUserRooms).mockResolvedValue(memberships);

      const result = await roomsService.getUserRooms('user-1');

      expect(result).toEqual([{ ...room, myRole: 'MEMBER' }]);
      expect(userRepository.getUserById).toHaveBeenCalledWith('user-1');
    });

    it('throws USER_NOT_FOUND for non-existent user', async () => {
      vi.mocked(userRepository.getUserById).mockResolvedValue(null);

      await expect(roomsService.getUserRooms('user-999'))
        .rejects.toMatchObject({ code: 'USER_NOT_FOUND', statusCode: 404 });
    });
  });

  describe('getRoomMembers', () => {
    it('returns room members', async () => {
      const room = createTestRoom({ id: 'room-1' });
      const user1 = createTestUser({ id: 'user-1', username: 'user1' });
      const user2 = createTestUser({ id: 'user-2', username: 'user2' });
      const members = [
        { id: 'member-1', roomId: 'room-1', userId: 'user-1', role: 'OWNER', joinedAt: new Date(), room, user: user1 },
        { id: 'member-2', roomId: 'room-1', userId: 'user-2', role: 'MEMBER', joinedAt: new Date(), room, user: user2 },
      ];

      vi.mocked(roomRepository.getRoomById).mockResolvedValue(room);
      vi.mocked(roomRepository.getRoomMembers).mockResolvedValue(members);

      const result = await roomsService.getRoomMembers('room-1');

      expect(result).toEqual(members);
    });

    it('throws ROOM_NOT_FOUND for non-existent room', async () => {
      vi.mocked(roomRepository.getRoomById).mockResolvedValue(null);

      await expect(roomsService.getRoomMembers('room-999'))
        .rejects.toMatchObject({ code: 'ROOM_NOT_FOUND', statusCode: 404 });
    });
  });

  describe('getRoomById', () => {
    it('returns room by id', async () => {
      const room = createTestRoom({ id: 'room-1', name: 'Test Room' });
      vi.mocked(roomRepository.getRoomById).mockResolvedValue(room);

      const result = await roomsService.getRoomById('room-1');

      expect(result).toEqual(room);
    });

    it('throws ROOM_NOT_FOUND for non-existent room', async () => {
      vi.mocked(roomRepository.getRoomById).mockResolvedValue(null);

      await expect(roomsService.getRoomById('room-999'))
        .rejects.toMatchObject({ code: 'ROOM_NOT_FOUND', statusCode: 404 });
    });
  });

  describe('createGroupRoom', () => {
    it('creates group room and adds creator as owner', async () => {
      const user = createTestUser({ id: 'user-1' });
      const room = createTestRoom({ id: 'room-1', name: 'Group Room', type: 'GROUP' });

      vi.mocked(userRepository.getUserById).mockResolvedValue(user);
      vi.mocked(roomRepository.createRoom).mockResolvedValue(room);
      vi.mocked(roomRepository.addMemberToRoom).mockResolvedValue({} as any);

      const result = await roomsService.createGroupRoom('user-1', 'Group Room');

      expect(result).toEqual(room);
      expect(roomRepository.createRoom).toHaveBeenCalledWith({ name: 'Group Room', type: 'GROUP' });
      expect(roomRepository.addMemberToRoom).toHaveBeenCalledWith('room-1', 'user-1', 'OWNER');
    });

    it('throws USER_NOT_FOUND if creator not found', async () => {
      vi.mocked(userRepository.getUserById).mockResolvedValue(null);

      await expect(roomsService.createGroupRoom('user-999', 'Group Room'))
        .rejects.toMatchObject({ code: 'USER_NOT_FOUND', statusCode: 404 });
    });
  });

  describe('createDirectRoom', () => {
    it('creates direct room between two users', async () => {
      const user1 = createTestUser({ id: 'user-1' });
      const user2 = createTestUser({ id: 'user-2' });
      const room = createTestRoom({ id: 'room-1', type: 'DIRECT', directKey: 'user-1_user-2' });

      vi.mocked(userRepository.getUserById).mockResolvedValueOnce(user1).mockResolvedValueOnce(user2);
      vi.mocked(roomRepository.findRoomByDirectKey).mockResolvedValue(null);
      vi.mocked(roomRepository.createRoom).mockResolvedValue(room);
      vi.mocked(roomRepository.addMemberToRoom).mockResolvedValue({} as any);

      const result = await roomsService.createDirectRoom('user-1', 'user-2');

      expect(result).toEqual(room);
      expect(roomRepository.findRoomByDirectKey).toHaveBeenCalledWith('user-1_user-2');
    });

    it('returns existing direct room if already exists', async () => {
      const user1 = createTestUser({ id: 'user-1' });
      const user2 = createTestUser({ id: 'user-2' });
      const existingRoom = createTestRoom({ id: 'room-1', type: 'DIRECT', directKey: 'user-1_user-2' });

      vi.mocked(userRepository.getUserById).mockResolvedValueOnce(user1).mockResolvedValueOnce(user2);
      vi.mocked(roomRepository.findRoomByDirectKey).mockResolvedValue(existingRoom);

      const result = await roomsService.createDirectRoom('user-1', 'user-2');

      expect(result).toEqual(existingRoom);
      expect(roomRepository.createRoom).not.toHaveBeenCalled();
    });

    it('throws error when creating direct room with self', async () => {
      await expect(roomsService.createDirectRoom('user-1', 'user-1'))
        .rejects.toMatchObject({ code: 'CANNOT_CREATE_DIRECT_ROOM_WITH_SELF', statusCode: 400 });
    });

    it('throws USER_NOT_FOUND if user not found', async () => {
      vi.mocked(userRepository.getUserById).mockResolvedValueOnce(createTestUser({ id: 'user-1' }));
      vi.mocked(userRepository.getUserById).mockResolvedValueOnce(null);

      await expect(roomsService.createDirectRoom('user-1', 'user-999'))
        .rejects.toMatchObject({ code: 'USER_NOT_FOUND', statusCode: 404 });
    });
  });

  describe('joinRoom', () => {
    it('joins group room successfully', async () => {
      const user = createTestUser({ id: 'user-1', emailVerified: true });
      const room = createTestRoom({ id: 'room-1', type: 'GROUP' });

      vi.mocked(userRepository.getUserById).mockResolvedValue(user);
      vi.mocked(roomRepository.getRoomById).mockResolvedValue(room);
      vi.mocked(roomRepository.isMemberOfRoom).mockResolvedValue(false);
      vi.mocked(roomRepository.addMemberToRoom).mockResolvedValue({} as any);

      const result = await roomsService.joinRoom('user-1', 'room-1');

      expect(result).toBeDefined();
      expect(roomRepository.addMemberToRoom).toHaveBeenCalledWith('room-1', 'user-1');
    });

    it('throws USER_NOT_FOUND for non-existent user', async () => {
      vi.mocked(userRepository.getUserById).mockResolvedValue(null);

      await expect(roomsService.joinRoom('user-999', 'room-1'))
        .rejects.toMatchObject({ code: 'USER_NOT_FOUND', statusCode: 404 });
    });

    it('throws EMAIL_NOT_VERIFIED if email not verified', async () => {
      const user = createTestUser({ id: 'user-1', emailVerified: false });
      vi.mocked(userRepository.getUserById).mockResolvedValue(user);

      await expect(roomsService.joinRoom('user-1', 'room-1'))
        .rejects.toMatchObject({ code: 'EMAIL_NOT_VERIFIED', statusCode: 403 });
    });

    it('throws ROOM_NOT_FOUND for non-existent room', async () => {
      const user = createTestUser({ id: 'user-1', emailVerified: true });
      vi.mocked(userRepository.getUserById).mockResolvedValue(user);
      vi.mocked(roomRepository.getRoomById).mockResolvedValue(null);

      await expect(roomsService.joinRoom('user-1', 'room-999'))
        .rejects.toMatchObject({ code: 'ROOM_NOT_FOUND', statusCode: 404 });
    });

    it('throws CANNOT_JOIN_DIRECT_ROOM for direct rooms', async () => {
      const user = createTestUser({ id: 'user-1', emailVerified: true });
      const room = createTestRoom({ id: 'room-1', type: 'DIRECT' });

      vi.mocked(userRepository.getUserById).mockResolvedValue(user);
      vi.mocked(roomRepository.getRoomById).mockResolvedValue(room);

      await expect(roomsService.joinRoom('user-1', 'room-1'))
        .rejects.toMatchObject({ code: 'CANNOT_JOIN_DIRECT_ROOM', statusCode: 400 });
    });

    it('throws ALREADY_MEMBER if user already in room', async () => {
      const user = createTestUser({ id: 'user-1', emailVerified: true });
      const room = createTestRoom({ id: 'room-1', type: 'GROUP' });

      vi.mocked(userRepository.getUserById).mockResolvedValue(user);
      vi.mocked(roomRepository.getRoomById).mockResolvedValue(room);
      vi.mocked(roomRepository.isMemberOfRoom).mockResolvedValue(true);

      await expect(roomsService.joinRoom('user-1', 'room-1'))
        .rejects.toMatchObject({ code: 'ALREADY_MEMBER', statusCode: 400 });
    });
  });

  describe('leaveRoom', () => {
    it('leaves group room successfully', async () => {
      const user = createTestUser({ id: 'user-1' });
      const room = createTestRoom({ id: 'room-1', type: 'GROUP' });
      const members = [
        { id: 'member-1', roomId: 'room-1', userId: 'user-1', role: 'MEMBER', joinedAt: new Date() },
        { id: 'member-2', roomId: 'room-1', userId: 'user-2', role: 'MEMBER', joinedAt: new Date() },
      ];

      vi.mocked(userRepository.getUserById).mockResolvedValue(user);
      vi.mocked(roomRepository.getRoomById).mockResolvedValue(room);
      vi.mocked(roomRepository.isMemberOfRoom).mockResolvedValue(true);
      vi.mocked(roomRepository.getRoomMembers).mockResolvedValue(members as any);
      vi.mocked(roomRepository.removeMemberFromRoom).mockResolvedValue({} as any);

      const result = await roomsService.leaveRoom('user-1', 'room-1');

      expect(result).toEqual({ message: 'User has left the room.' });
      expect(roomRepository.removeMemberFromRoom).toHaveBeenCalledWith('room-1', 'user-1', expect.any(Object));
    });

    it('deletes room if last member leaves', async () => {
      const user = createTestUser({ id: 'user-1' });
      const room = createTestRoom({ id: 'room-1', type: 'GROUP' });
      const members = [{ id: 'member-1', roomId: 'room-1', userId: 'user-1', role: 'OWNER', joinedAt: new Date() }];

      vi.mocked(userRepository.getUserById).mockResolvedValue(user);
      vi.mocked(roomRepository.getRoomById).mockResolvedValue(room);
      vi.mocked(roomRepository.isMemberOfRoom).mockResolvedValue(true);
      vi.mocked(roomRepository.getRoomMembers).mockResolvedValue(members as any);
      vi.mocked(roomRepository.deleteRoom).mockResolvedValue(room);

      const result = await roomsService.leaveRoom('user-1', 'room-1');

      expect(result).toEqual({ message: 'Room deleted as it had no more members.' });
      expect(roomRepository.deleteRoom).toHaveBeenCalledWith('room-1', expect.any(Object));
    });

    it('transfers ownership if owner leaves and other members exist', async () => {
      const user = createTestUser({ id: 'user-1' });
      const room = createTestRoom({ id: 'room-1', type: 'GROUP' });
      const members = [
        { id: 'member-1', roomId: 'room-1', userId: 'user-1', role: 'OWNER', joinedAt: new Date() },
        { id: 'member-2', roomId: 'room-1', userId: 'user-2', role: 'MEMBER', joinedAt: new Date() },
      ];

      vi.mocked(userRepository.getUserById).mockResolvedValue(user);
      vi.mocked(roomRepository.getRoomById).mockResolvedValue(room);
      vi.mocked(roomRepository.isMemberOfRoom).mockResolvedValue(true);
      vi.mocked(roomRepository.getRoomMembers).mockResolvedValue(members as any);
      vi.mocked(roomRepository.changeRoomMemberRole).mockResolvedValue({} as any);
      vi.mocked(roomRepository.removeMemberFromRoom).mockResolvedValue({} as any);

      const result = await roomsService.leaveRoom('user-1', 'room-1');

      expect(result).toEqual({ message: 'User has left the room.' });
      expect(roomRepository.changeRoomMemberRole).toHaveBeenCalledWith('room-1', 'user-2', 'OWNER', expect.any(Object));
    });

    it('throws USER_NOT_FOUND for non-existent user', async () => {
      vi.mocked(userRepository.getUserById).mockResolvedValue(null);

      await expect(roomsService.leaveRoom('user-999', 'room-1'))
        .rejects.toMatchObject({ code: 'USER_NOT_FOUND', statusCode: 404 });
    });

    it('throws ROOM_NOT_FOUND for non-existent room', async () => {
      const user = createTestUser({ id: 'user-1' });
      vi.mocked(userRepository.getUserById).mockResolvedValue(user);
      vi.mocked(roomRepository.getRoomById).mockResolvedValue(null);

      await expect(roomsService.leaveRoom('user-1', 'room-999'))
        .rejects.toMatchObject({ code: 'ROOM_NOT_FOUND', statusCode: 404 });
    });

    it('throws NOT_IN_ROOM if user not a member', async () => {
      const user = createTestUser({ id: 'user-1' });
      const room = createTestRoom({ id: 'room-1', type: 'GROUP' });

      vi.mocked(userRepository.getUserById).mockResolvedValue(user);
      vi.mocked(roomRepository.getRoomById).mockResolvedValue(room);
      vi.mocked(roomRepository.isMemberOfRoom).mockResolvedValue(false);

      await expect(roomsService.leaveRoom('user-1', 'room-1'))
        .rejects.toMatchObject({ code: 'NOT_IN_ROOM', statusCode: 400 });
    });

    it('throws CANNOT_LEAVE_DIRECT_ROOM for direct rooms', async () => {
      const user = createTestUser({ id: 'user-1' });
      const room = createTestRoom({ id: 'room-1', type: 'DIRECT' });

      vi.mocked(userRepository.getUserById).mockResolvedValue(user);
      vi.mocked(roomRepository.getRoomById).mockResolvedValue(room);
      vi.mocked(roomRepository.isMemberOfRoom).mockResolvedValue(true);

      await expect(roomsService.leaveRoom('user-1', 'room-1'))
        .rejects.toMatchObject({ code: 'CANNOT_LEAVE_DIRECT_ROOM', statusCode: 400 });
    });
  });

  describe('transferOwnership', () => {
    it('transfers ownership successfully', async () => {
      const room = createTestRoom({ id: 'room-1', type: 'GROUP' });
      const members = [
        { id: 'member-1', roomId: 'room-1', userId: 'user-1', role: 'OWNER', joinedAt: new Date() },
        { id: 'member-2', roomId: 'room-1', userId: 'user-2', role: 'MEMBER', joinedAt: new Date() },
      ];

      vi.mocked(roomRepository.getRoomById).mockResolvedValue(room);
      vi.mocked(roomRepository.getRoomMembers).mockResolvedValue(members as any);
      vi.mocked(roomRepository.changeRoomMemberRole).mockResolvedValue({} as any);

      const result = await roomsService.transferOwnership('room-1', 'user-1', 'user-2');

      expect(roomRepository.changeRoomMemberRole).toHaveBeenCalledWith('room-1', 'user-1', 'ADMIN', expect.any(Object));
      expect(roomRepository.changeRoomMemberRole).toHaveBeenCalledWith('room-1', 'user-2', 'OWNER', expect.any(Object));
    });

    it('throws ROOM_NOT_FOUND for non-existent room', async () => {
      vi.mocked(roomRepository.getRoomById).mockResolvedValue(null);

      await expect(roomsService.transferOwnership('room-999', 'user-1', 'user-2'))
        .rejects.toMatchObject({ code: 'ROOM_NOT_FOUND', statusCode: 404 });
    });

    it('throws GROUP_ROOM_REQUIRED for direct rooms', async () => {
      const room = createTestRoom({ id: 'room-1', type: 'DIRECT' });
      vi.mocked(roomRepository.getRoomById).mockResolvedValue(room);

      await expect(roomsService.transferOwnership('room-1', 'user-1', 'user-2'))
        .rejects.toMatchObject({ code: 'GROUP_ROOM_REQUIRED', statusCode: 400 });
    });

    it('throws OWNER_REQUIRED if current user not owner', async () => {
      const room = createTestRoom({ id: 'room-1', type: 'GROUP' });
      const members = [
        { id: 'member-1', roomId: 'room-1', userId: 'user-1', role: 'MEMBER', joinedAt: new Date() },
        { id: 'member-2', roomId: 'room-1', userId: 'user-2', role: 'MEMBER', joinedAt: new Date() },
      ];

      vi.mocked(roomRepository.getRoomById).mockResolvedValue(room);
      vi.mocked(roomRepository.getRoomMembers).mockResolvedValue(members as any);

      await expect(roomsService.transferOwnership('room-1', 'user-1', 'user-2'))
        .rejects.toMatchObject({ code: 'OWNER_REQUIRED', statusCode: 403 });
    });

    it('throws NOT_IN_ROOM if target user not in room', async () => {
      const room = createTestRoom({ id: 'room-1', type: 'GROUP' });
      const members = [
        { id: 'member-1', roomId: 'room-1', userId: 'user-1', role: 'OWNER', joinedAt: new Date() },
      ];

      vi.mocked(roomRepository.getRoomById).mockResolvedValue(room);
      vi.mocked(roomRepository.getRoomMembers).mockResolvedValue(members as any);

      await expect(roomsService.transferOwnership('room-1', 'user-1', 'user-999'))
        .rejects.toMatchObject({ code: 'NOT_IN_ROOM', statusCode: 400 });
    });

    it('throws CANNOT_TRANSFER_TO_SELF if transferring to self', async () => {
      const room = createTestRoom({ id: 'room-1', type: 'GROUP' });
      const members = [
        { id: 'member-1', roomId: 'room-1', userId: 'user-1', role: 'OWNER', joinedAt: new Date() },
      ];

      vi.mocked(roomRepository.getRoomById).mockResolvedValue(room);
      vi.mocked(roomRepository.getRoomMembers).mockResolvedValue(members as any);

      await expect(roomsService.transferOwnership('room-1', 'user-1', 'user-1'))
        .rejects.toMatchObject({ code: 'CANNOT_TRANSFER_TO_SELF', statusCode: 400 });
    });
  });

  describe('promoteMember', () => {
    it('promotes member to admin successfully', async () => {
      const room = createTestRoom({ id: 'room-1', type: 'GROUP' });
      const members = [
        { id: 'member-1', roomId: 'room-1', userId: 'user-1', role: 'OWNER', joinedAt: new Date() },
        { id: 'member-2', roomId: 'room-1', userId: 'user-2', role: 'MEMBER', joinedAt: new Date() },
      ];

      vi.mocked(roomRepository.getRoomById).mockResolvedValue(room);
      vi.mocked(roomRepository.getRoomMembers).mockResolvedValue(members as any);
      vi.mocked(roomRepository.changeRoomMemberRole).mockResolvedValue({} as any);

      const result = await roomsService.promoteMember('room-1', 'user-1', 'user-2');

      expect(result).toBeDefined();
      expect(roomRepository.changeRoomMemberRole).toHaveBeenCalledWith('room-1', 'user-2', 'ADMIN');
    });

    it('throws CANNOT_PROMOTE_SELF if promoting self', async () => {
      await expect(roomsService.promoteMember('room-1', 'user-1', 'user-1'))
        .rejects.toMatchObject({ code: 'CANNOT_PROMOTE_SELF', statusCode: 400 });
    });

    it('throws ROOM_NOT_FOUND for non-existent room', async () => {
      vi.mocked(roomRepository.getRoomById).mockResolvedValue(null);

      await expect(roomsService.promoteMember('room-999', 'user-1', 'user-2'))
        .rejects.toMatchObject({ code: 'ROOM_NOT_FOUND', statusCode: 404 });
    });

    it('throws GROUP_ROOM_REQUIRED for direct rooms', async () => {
      const room = createTestRoom({ id: 'room-1', type: 'DIRECT' });
      vi.mocked(roomRepository.getRoomById).mockResolvedValue(room);

      await expect(roomsService.promoteMember('room-1', 'user-1', 'user-2'))
        .rejects.toMatchObject({ code: 'GROUP_ROOM_REQUIRED', statusCode: 400 });
    });

    it('throws OWNER_REQUIRED if requester not owner', async () => {
      const room = createTestRoom({ id: 'room-1', type: 'GROUP' });
      const members = [
        { id: 'member-1', roomId: 'room-1', userId: 'user-1', role: 'MEMBER', joinedAt: new Date() },
        { id: 'member-2', roomId: 'room-1', userId: 'user-2', role: 'MEMBER', joinedAt: new Date() },
      ];

      vi.mocked(roomRepository.getRoomById).mockResolvedValue(room);
      vi.mocked(roomRepository.getRoomMembers).mockResolvedValue(members as any);

      await expect(roomsService.promoteMember('room-1', 'user-1', 'user-2'))
        .rejects.toMatchObject({ code: 'OWNER_REQUIRED', statusCode: 403 });
    });

    it('throws NOT_IN_ROOM if target not in room', async () => {
      const room = createTestRoom({ id: 'room-1', type: 'GROUP' });
      const members = [
        { id: 'member-1', roomId: 'room-1', userId: 'user-1', role: 'OWNER', joinedAt: new Date() },
      ];

      vi.mocked(roomRepository.getRoomById).mockResolvedValue(room);
      vi.mocked(roomRepository.getRoomMembers).mockResolvedValue(members as any);

      await expect(roomsService.promoteMember('room-1', 'user-1', 'user-999'))
        .rejects.toMatchObject({ code: 'NOT_IN_ROOM', statusCode: 400 });
    });

    it('throws ALREADY_ADMIN if target already admin', async () => {
      const room = createTestRoom({ id: 'room-1', type: 'GROUP' });
      const members = [
        { id: 'member-1', roomId: 'room-1', userId: 'user-1', role: 'OWNER', joinedAt: new Date() },
        { id: 'member-2', roomId: 'room-1', userId: 'user-2', role: 'ADMIN', joinedAt: new Date() },
      ];

      vi.mocked(roomRepository.getRoomById).mockResolvedValue(room);
      vi.mocked(roomRepository.getRoomMembers).mockResolvedValue(members as any);

      await expect(roomsService.promoteMember('room-1', 'user-1', 'user-2'))
        .rejects.toMatchObject({ code: 'ALREADY_ADMIN', statusCode: 400 });
    });
  });

  describe('demoteMember', () => {
    it('demotes admin to member successfully', async () => {
      const room = createTestRoom({ id: 'room-1', type: 'GROUP' });
      const members = [
        { id: 'member-1', roomId: 'room-1', userId: 'user-1', role: 'OWNER', joinedAt: new Date() },
        { id: 'member-2', roomId: 'room-1', userId: 'user-2', role: 'ADMIN', joinedAt: new Date() },
      ];

      vi.mocked(roomRepository.getRoomById).mockResolvedValue(room);
      vi.mocked(roomRepository.getRoomMembers).mockResolvedValue(members as any);
      vi.mocked(roomRepository.changeRoomMemberRole).mockResolvedValue({} as any);

      const result = await roomsService.demoteMember('room-1', 'user-1', 'user-2');

      expect(result).toBeDefined();
      expect(roomRepository.changeRoomMemberRole).toHaveBeenCalledWith('room-1', 'user-2', 'MEMBER');
    });

    it('throws ROOM_NOT_FOUND for non-existent room', async () => {
      vi.mocked(roomRepository.getRoomById).mockResolvedValue(null);

      await expect(roomsService.demoteMember('room-999', 'user-1', 'user-2'))
        .rejects.toMatchObject({ code: 'ROOM_NOT_FOUND', statusCode: 404 });
    });

    it('throws GROUP_ROOM_REQUIRED for direct rooms', async () => {
      const room = createTestRoom({ id: 'room-1', type: 'DIRECT' });
      vi.mocked(roomRepository.getRoomById).mockResolvedValue(room);

      await expect(roomsService.demoteMember('room-1', 'user-1', 'user-2'))
        .rejects.toMatchObject({ code: 'GROUP_ROOM_REQUIRED', statusCode: 400 });
    });

    it('throws OWNER_REQUIRED if requester not owner', async () => {
      const room = createTestRoom({ id: 'room-1', type: 'GROUP' });
      const members = [
        { id: 'member-1', roomId: 'room-1', userId: 'user-1', role: 'ADMIN', joinedAt: new Date() },
        { id: 'member-2', roomId: 'room-1', userId: 'user-2', role: 'ADMIN', joinedAt: new Date() },
      ];

      vi.mocked(roomRepository.getRoomById).mockResolvedValue(room);
      vi.mocked(roomRepository.getRoomMembers).mockResolvedValue(members as any);

      await expect(roomsService.demoteMember('room-1', 'user-1', 'user-2'))
        .rejects.toMatchObject({ code: 'OWNER_REQUIRED', statusCode: 403 });
    });

    it('throws NOT_IN_ROOM if target not in room', async () => {
      const room = createTestRoom({ id: 'room-1', type: 'GROUP' });
      const members = [
        { id: 'member-1', roomId: 'room-1', userId: 'user-1', role: 'OWNER', joinedAt: new Date() },
      ];

      vi.mocked(roomRepository.getRoomById).mockResolvedValue(room);
      vi.mocked(roomRepository.getRoomMembers).mockResolvedValue(members as any);

      await expect(roomsService.demoteMember('room-1', 'user-1', 'user-999'))
        .rejects.toMatchObject({ code: 'NOT_IN_ROOM', statusCode: 400 });
    });

    it('throws NOT_ADMIN if target not admin', async () => {
      const room = createTestRoom({ id: 'room-1', type: 'GROUP' });
      const members = [
        { id: 'member-1', roomId: 'room-1', userId: 'user-1', role: 'OWNER', joinedAt: new Date() },
        { id: 'member-2', roomId: 'room-1', userId: 'user-2', role: 'MEMBER', joinedAt: new Date() },
      ];

      vi.mocked(roomRepository.getRoomById).mockResolvedValue(room);
      vi.mocked(roomRepository.getRoomMembers).mockResolvedValue(members as any);

      await expect(roomsService.demoteMember('room-1', 'user-1', 'user-2'))
        .rejects.toMatchObject({ code: 'NOT_ADMIN', statusCode: 400 });
    });
  });

  describe('kickMember', () => {
    it('kicks member successfully by owner', async () => {
      const room = createTestRoom({ id: 'room-1', type: 'GROUP' });
      const members = [
        { id: 'member-1', roomId: 'room-1', userId: 'user-1', role: 'OWNER', joinedAt: new Date() },
        { id: 'member-2', roomId: 'room-1', userId: 'user-2', role: 'MEMBER', joinedAt: new Date() },
      ];

      vi.mocked(roomRepository.getRoomById).mockResolvedValue(room);
      vi.mocked(roomRepository.getRoomMembers).mockResolvedValue(members as any);
      vi.mocked(roomRepository.removeMemberFromRoom).mockResolvedValue({} as any);

      const result = await roomsService.kickMember('room-1', 'user-1', 'user-2');

      expect(result).toBeDefined();
      expect(roomRepository.removeMemberFromRoom).toHaveBeenCalledWith('room-1', 'user-2');
    });

    it('kicks member successfully by admin', async () => {
      const room = createTestRoom({ id: 'room-1', type: 'GROUP' });
      const members = [
        { id: 'member-1', roomId: 'room-1', userId: 'user-1', role: 'ADMIN', joinedAt: new Date() },
        { id: 'member-2', roomId: 'room-1', userId: 'user-2', role: 'MEMBER', joinedAt: new Date() },
      ];

      vi.mocked(roomRepository.getRoomById).mockResolvedValue(room);
      vi.mocked(roomRepository.getRoomMembers).mockResolvedValue(members as any);
      vi.mocked(roomRepository.removeMemberFromRoom).mockResolvedValue({} as any);

      const result = await roomsService.kickMember('room-1', 'user-1', 'user-2');

      expect(result).toBeDefined();
      expect(roomRepository.removeMemberFromRoom).toHaveBeenCalledWith('room-1', 'user-2');
    });

    it('throws CANNOT_KICK_SELF if kicking self', async () => {
      await expect(roomsService.kickMember('room-1', 'user-1', 'user-1'))
        .rejects.toMatchObject({ code: 'CANNOT_KICK_SELF', statusCode: 400 });
    });

    it('throws ROOM_NOT_FOUND for non-existent room', async () => {
      vi.mocked(roomRepository.getRoomById).mockResolvedValue(null);

      await expect(roomsService.kickMember('room-999', 'user-1', 'user-2'))
        .rejects.toMatchObject({ code: 'ROOM_NOT_FOUND', statusCode: 404 });
    });

    it('throws CANNOT_KICK_FROM_DIRECT_ROOM for direct rooms', async () => {
      const room = createTestRoom({ id: 'room-1', type: 'DIRECT' });
      vi.mocked(roomRepository.getRoomById).mockResolvedValue(room);

      await expect(roomsService.kickMember('room-1', 'user-1', 'user-2'))
        .rejects.toMatchObject({ code: 'CANNOT_KICK_FROM_DIRECT_ROOM', statusCode: 400 });
    });

    it('throws ADMIN_OR_OWNER_REQUIRED if kicker not admin or owner', async () => {
      const room = createTestRoom({ id: 'room-1', type: 'GROUP' });
      const members = [
        { id: 'member-1', roomId: 'room-1', userId: 'user-1', role: 'MEMBER', joinedAt: new Date() },
        { id: 'member-2', roomId: 'room-1', userId: 'user-2', role: 'MEMBER', joinedAt: new Date() },
      ];

      vi.mocked(roomRepository.getRoomById).mockResolvedValue(room);
      vi.mocked(roomRepository.getRoomMembers).mockResolvedValue(members as any);

      await expect(roomsService.kickMember('room-1', 'user-1', 'user-2'))
        .rejects.toMatchObject({ code: 'ADMIN_OR_OWNER_REQUIRED', statusCode: 403 });
    });

    it('throws NOT_IN_ROOM if target not in room', async () => {
      const room = createTestRoom({ id: 'room-1', type: 'GROUP' });
      const members = [
        { id: 'member-1', roomId: 'room-1', userId: 'user-1', role: 'OWNER', joinedAt: new Date() },
      ];

      vi.mocked(roomRepository.getRoomById).mockResolvedValue(room);
      vi.mocked(roomRepository.getRoomMembers).mockResolvedValue(members as any);

      await expect(roomsService.kickMember('room-1', 'user-1', 'user-999'))
        .rejects.toMatchObject({ code: 'NOT_IN_ROOM', statusCode: 400 });
    });

    it('throws CANNOT_KICK_OWNER if target is owner', async () => {
      const room = createTestRoom({ id: 'room-1', type: 'GROUP' });
      const members = [
        { id: 'member-1', roomId: 'room-1', userId: 'user-1', role: 'OWNER', joinedAt: new Date() },
        { id: 'member-2', roomId: 'room-1', userId: 'user-2', role: 'ADMIN', joinedAt: new Date() },
      ];

      vi.mocked(roomRepository.getRoomById).mockResolvedValue(room);
      vi.mocked(roomRepository.getRoomMembers).mockResolvedValue(members as any);

      await expect(roomsService.kickMember('room-1', 'user-2', 'user-1'))
        .rejects.toMatchObject({ code: 'CANNOT_KICK_OWNER', statusCode: 403 });
    });

    it('throws CANNOT_KICK_ADMIN if admin tries to kick another admin', async () => {
      const room = createTestRoom({ id: 'room-1', type: 'GROUP' });
      const members = [
        { id: 'member-1', roomId: 'room-1', userId: 'user-1', role: 'ADMIN', joinedAt: new Date() },
        { id: 'member-2', roomId: 'room-1', userId: 'user-2', role: 'ADMIN', joinedAt: new Date() },
      ];

      vi.mocked(roomRepository.getRoomById).mockResolvedValue(room);
      vi.mocked(roomRepository.getRoomMembers).mockResolvedValue(members as any);

      await expect(roomsService.kickMember('room-1', 'user-1', 'user-2'))
        .rejects.toMatchObject({ code: 'CANNOT_KICK_ADMIN', statusCode: 403 });
    });
  });
});