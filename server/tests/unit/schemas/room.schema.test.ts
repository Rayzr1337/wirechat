import { describe, it, expect } from 'vitest';
import {
  roomNameSchema,
  userIdSchema,
  roomIdSchema,
  createRoomBodySchema,
  createDirectMessageRoomBodySchema,
  transferOwnershipBodySchema,
  promoteMemberBodySchema,
  demoteMemberBodySchema,
  kickMemberBodySchema,
} from '@/schemas/room.schema';

describe('Room Schemas Validation', () => {
  describe('roomNameSchema', () => {
    it('accepts valid room name', () => {
      const result = roomNameSchema.safeParse('My Room');
      expect(result.success).toBe(true);
    });

    it('accepts room name with special characters', () => {
      const result = roomNameSchema.safeParse('Room #1 - General');
      expect(result.success).toBe(true);
    });

    it('rejects empty string', () => {
      const result = roomNameSchema.safeParse('');
      expect(result.success).toBe(false);
    });

    it('rejects name too long', () => {
      const result = roomNameSchema.safeParse('a'.repeat(101));
      expect(result.success).toBe(false);
    });

    it('trims whitespace', () => {
      const result = roomNameSchema.safeParse('  My Room  ');
      expect(result.success).toBe(true);
      if (result.success) expect(result.data).toBe('My Room');
    });
  });

  describe('userIdSchema / roomIdSchema', () => {
    it('accepts valid UUID', () => {
      const result = userIdSchema.safeParse('11111111-1111-4111-8111-111111111111');
      expect(result.success).toBe(true);
    });

    it('rejects invalid UUID', () => {
      const result = userIdSchema.safeParse('not-a-uuid');
      expect(result.success).toBe(false);
    });

    it('rejects short string', () => {
      const result = userIdSchema.safeParse('123');
      expect(result.success).toBe(false);
    });
  });

  describe('createRoomBodySchema', () => {
    it('accepts valid room creation', () => {
      const result = createRoomBodySchema.safeParse({ roomName: 'New Room' });
      expect(result.success).toBe(true);
    });

    it('rejects missing roomName', () => {
      const result = createRoomBodySchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('rejects empty roomName', () => {
      const result = createRoomBodySchema.safeParse({ roomName: '' });
      expect(result.success).toBe(false);
    });

    it('rejects roomName too long', () => {
      const result = createRoomBodySchema.safeParse({ roomName: 'a'.repeat(101) });
      expect(result.success).toBe(false);
    });
  });

  describe('createDirectMessageRoomBodySchema', () => {
    it('accepts valid targetUserId', () => {
      const result = createDirectMessageRoomBodySchema.safeParse({
        targetUserId: '11111111-1111-4111-8111-111111111111',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid UUID', () => {
      const result = createDirectMessageRoomBodySchema.safeParse({ targetUserId: 'not-a-uuid' });
      expect(result.success).toBe(false);
    });

    it('rejects missing targetUserId', () => {
      const result = createDirectMessageRoomBodySchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('transferOwnershipBodySchema', () => {
    it('accepts valid newOwnerId', () => {
      const result = transferOwnershipBodySchema.safeParse({
        newOwnerId: '11111111-1111-4111-8111-111111111111',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid UUID', () => {
      const result = transferOwnershipBodySchema.safeParse({ newOwnerId: 'not-a-uuid' });
      expect(result.success).toBe(false);
    });
  });

  describe('promoteMemberBodySchema', () => {
    it('accepts valid memberId', () => {
      const result = promoteMemberBodySchema.safeParse({
        memberId: '11111111-1111-4111-8111-111111111111',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid UUID', () => {
      const result = promoteMemberBodySchema.safeParse({ memberId: 'not-a-uuid' });
      expect(result.success).toBe(false);
    });
  });

  describe('demoteMemberBodySchema', () => {
    it('accepts valid adminId', () => {
      const result = demoteMemberBodySchema.safeParse({
        adminId: '11111111-1111-4111-8111-111111111111',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid UUID', () => {
      const result = demoteMemberBodySchema.safeParse({ adminId: 'not-a-uuid' });
      expect(result.success).toBe(false);
    });
  });

  describe('kickMemberBodySchema', () => {
    it('accepts valid memberId', () => {
      const result = kickMemberBodySchema.safeParse({
        memberId: '11111111-1111-4111-8111-111111111111',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid UUID', () => {
      const result = kickMemberBodySchema.safeParse({ memberId: 'not-a-uuid' });
      expect(result.success).toBe(false);
    });
  });
});