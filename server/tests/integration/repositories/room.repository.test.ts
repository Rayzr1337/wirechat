import { describe, it, expect, vi, beforeEach } from 'vitest';
import { roomRepository } from '@/repositories/room.repository';
import { mockPrisma } from '@/../tests/mocks/prisma-client';
import { createTestRoom, createTestUser, clearTestCounters } from '@/../tests/utils/factories';

describe('RoomRepository Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearTestCounters();
  });

  describe('createRoom', () => {
    it('creates room with provided data', async () => {
      const room = createTestRoom({ id: 'room-1', name: 'Test Room', type: 'GROUP' });
      mockPrisma.room.create.mockResolvedValue(room);

      const created = await roomRepository.createRoom({ name: 'Test Room', type: 'GROUP' });

      expect(created.id).toBe('room-1');
      expect(created.name).toBe('Test Room');
      expect(created.type).toBe('GROUP');
      expect(mockPrisma.room.create).toHaveBeenCalledWith({
        data: { name: 'Test Room', type: 'GROUP' },
      });
    });

    it('creates direct room with directKey', async () => {
      const room = createTestRoom({ id: 'room-1', type: 'DIRECT', directKey: 'user-1_user-2' });
      mockPrisma.room.create.mockResolvedValue(room);

      const created = await roomRepository.createRoom({ type: 'DIRECT', directKey: 'user-1_user-2' });

      expect(created.type).toBe('DIRECT');
      expect(created.directKey).toBe('user-1_user-2');
    });
  });

  describe('getRoomById', () => {
    it('returns room when found', async () => {
      const room = createTestRoom({ id: 'room-1', name: 'Test Room' });
      mockPrisma.room.findUnique.mockResolvedValue(room);

      const found = await roomRepository.getRoomById('room-1');

      expect(found).not.toBeNull();
      expect(found!.id).toBe('room-1');
      expect(found!.name).toBe('Test Room');
      expect(mockPrisma.room.findUnique).toHaveBeenCalledWith({ where: { id: 'room-1' } });
    });

    it('returns null when room not found', async () => {
      mockPrisma.room.findUnique.mockResolvedValue(null);

      const found = await roomRepository.getRoomById('room-999');

      expect(found).toBeNull();
    });
  });

  describe('getUserRooms', () => {
    it('returns rooms with roles for user', async () => {
      const user = createTestUser({ id: 'user-1' });
      const room = createTestRoom({ id: 'room-1', name: 'Test Room' });
      const memberships = [
        { room, role: 'OWNER' },
        { room: { ...room, id: 'room-2', name: 'Room 2' }, role: 'MEMBER' },
      ];
      mockPrisma.roomMember.findMany.mockResolvedValue(memberships as any);

      const result = await roomRepository.getUserRooms('user-1');

      expect(result).toHaveLength(2);
      expect(result[0].room.id).toBe('room-1');
      expect(result[0].role).toBe('OWNER');
      expect(result[1].role).toBe('MEMBER');
      expect(mockPrisma.roomMember.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        include: { room: true },
      });
    });

    it('returns empty array when user has no rooms', async () => {
      mockPrisma.roomMember.findMany.mockResolvedValue([]);

      const result = await roomRepository.getUserRooms('user-1');

      expect(result).toEqual([]);
    });
  });

  describe('updateRoom', () => {
    it('updates room with provided data', async () => {
      const updated = createTestRoom({ id: 'room-1', name: 'Updated Room' });
      mockPrisma.room.update.mockResolvedValue(updated);

      const result = await roomRepository.updateRoom('room-1', { name: 'Updated Room' });

      expect(result.name).toBe('Updated Room');
      expect(mockPrisma.room.update).toHaveBeenCalledWith({
        where: { id: 'room-1' },
        data: { name: 'Updated Room' },
      });
    });
  });

  describe('deleteRoom', () => {
    it('deletes room by id', async () => {
      const room = createTestRoom({ id: 'room-1' });
      mockPrisma.room.delete.mockResolvedValue(room);

      const result = await roomRepository.deleteRoom('room-1');

      expect(result.id).toBe('room-1');
      expect(mockPrisma.room.delete).toHaveBeenCalledWith({ where: { id: 'room-1' } });
    });
  });

  describe('findRoomByDirectKey', () => {
    it('returns direct room when found', async () => {
      const room = createTestRoom({ id: 'room-1', type: 'DIRECT', directKey: 'user-1_user-2' });
      mockPrisma.room.findUnique.mockResolvedValue(room);

      const found = await roomRepository.findRoomByDirectKey('user-1_user-2');

      expect(found).not.toBeNull();
      expect(found!.type).toBe('DIRECT');
      expect(found!.directKey).toBe('user-1_user-2');
      expect(mockPrisma.room.findUnique).toHaveBeenCalledWith({ where: { directKey: 'user-1_user-2' } });
    });

    it('returns null when direct room not found', async () => {
      mockPrisma.room.findUnique.mockResolvedValue(null);

      const found = await roomRepository.findRoomByDirectKey('user-1_user-999');

      expect(found).toBeNull();
    });
  });

  describe('getRoomMembers', () => {
    it('returns members with user include', async () => {
      const user1 = createTestUser({ id: 'user-1', username: 'user1' });
      const user2 = createTestUser({ id: 'user-2', username: 'user2' });
      const room = createTestRoom({ id: 'room-1' });
      const members = [
        { id: 'member-1', roomId: 'room-1', userId: 'user-1', role: 'OWNER', joinedAt: new Date(), room, user: user1 },
        { id: 'member-2', roomId: 'room-1', userId: 'user-2', role: 'MEMBER', joinedAt: new Date(), room, user: user2 },
      ];
      mockPrisma.roomMember.findMany.mockResolvedValue(members as any);

      const result = await roomRepository.getRoomMembers('room-1');

      expect(result).toHaveLength(2);
      expect(result[0].userId).toBe('user-1');
      expect(result[0].user.username).toBe('user1');
      expect(result[1].role).toBe('MEMBER');
      expect(mockPrisma.roomMember.findMany).toHaveBeenCalledWith({
        where: { roomId: 'room-1' },
        include: { user: true },
      });
    });

    it('returns empty array when room has no members', async () => {
      mockPrisma.roomMember.findMany.mockResolvedValue([]);

      const result = await roomRepository.getRoomMembers('room-999');

      expect(result).toEqual([]);
    });
  });

  describe('getRoomsForUser', () => {
    it('returns room memberships without user include', async () => {
      const memberships = [
        { id: 'member-1', roomId: 'room-1', userId: 'user-1', role: 'OWNER', joinedAt: new Date() },
        { id: 'member-2', roomId: 'room-2', userId: 'user-1', role: 'MEMBER', joinedAt: new Date() },
      ];
      mockPrisma.roomMember.findMany.mockResolvedValue(memberships as any);

      const result = await roomRepository.getRoomsForUser('user-1');

      expect(result).toHaveLength(2);
      expect(result[0].role).toBe('OWNER');
      expect(result[1].role).toBe('MEMBER');
      expect(mockPrisma.roomMember.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });
  });

  describe('isMemberOfRoom', () => {
    it('returns true when user is member', async () => {
      mockPrisma.roomMember.findUnique.mockResolvedValue({ id: 'member-1', roomId: 'room-1', userId: 'user-1', role: 'MEMBER', joinedAt: new Date() });

      const result = await roomRepository.isMemberOfRoom('room-1', 'user-1');

      expect(result).toBe(true);
      expect(mockPrisma.roomMember.findUnique).toHaveBeenCalledWith({
        where: { roomId_userId: { roomId: 'room-1', userId: 'user-1' } },
      });
    });

    it('returns false when user is not member', async () => {
      mockPrisma.roomMember.findUnique.mockResolvedValue(null);

      const result = await roomRepository.isMemberOfRoom('room-1', 'user-999');

      expect(result).toBe(false);
    });
  });

  describe('addMemberToRoom', () => {
    it('adds member with default MEMBER role', async () => {
      const membership = { id: 'member-1', roomId: 'room-1', userId: 'user-1', role: 'MEMBER', joinedAt: new Date() };
      mockPrisma.roomMember.create.mockResolvedValue(membership as any);

      const result = await roomRepository.addMemberToRoom('room-1', 'user-1');

      expect(result.role).toBe('MEMBER');
      expect(mockPrisma.roomMember.create).toHaveBeenCalledWith({
        data: { roomId: 'room-1', userId: 'user-1', role: 'MEMBER' },
      });
    });

    it('adds member with custom role', async () => {
      const membership = { id: 'member-1', roomId: 'room-1', userId: 'user-1', role: 'ADMIN', joinedAt: new Date() };
      mockPrisma.roomMember.create.mockResolvedValue(membership as any);

      const result = await roomRepository.addMemberToRoom('room-1', 'user-1', 'ADMIN');

      expect(result.role).toBe('ADMIN');
      expect(mockPrisma.roomMember.create).toHaveBeenCalledWith({
        data: { roomId: 'room-1', userId: 'user-1', role: 'ADMIN' },
      });
    });
  });

  describe('removeMemberFromRoom', () => {
    it('removes member from room', async () => {
      const membership = { id: 'member-1', roomId: 'room-1', userId: 'user-1', role: 'MEMBER', joinedAt: new Date() };
      mockPrisma.roomMember.delete.mockResolvedValue(membership as any);

      const result = await roomRepository.removeMemberFromRoom('room-1', 'user-1');

      expect(result.id).toBe('member-1');
      expect(mockPrisma.roomMember.delete).toHaveBeenCalledWith({
        where: { roomId_userId: { roomId: 'room-1', userId: 'user-1' } },
      });
    });
  });

  describe('changeRoomMemberRole', () => {
    it('changes member role', async () => {
      const membership = { id: 'member-1', roomId: 'room-1', userId: 'user-1', role: 'ADMIN', joinedAt: new Date() };
      mockPrisma.roomMember.update.mockResolvedValue(membership as any);

      const result = await roomRepository.changeRoomMemberRole('room-1', 'user-1', 'ADMIN');

      expect(result.role).toBe('ADMIN');
      expect(mockPrisma.roomMember.update).toHaveBeenCalledWith({
        where: { roomId_userId: { roomId: 'room-1', userId: 'user-1' } },
        data: { role: 'ADMIN' },
      });
    });
  });
});