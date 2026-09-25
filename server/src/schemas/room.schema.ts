import { z } from "zod";

export const roomNameSchema = z
  .string()
  .trim()
  .min(1, "Room name is required")
  .max(100, "Room name must be at most 100 characters");

export const userIdSchema = z.string().uuid("Invalid user ID format");

export const roomIdSchema = z.string().uuid("Invalid room ID format");

export const createRoomBodySchema = z.object({
  roomName: roomNameSchema,
});

export const createDirectMessageRoomBodySchema = z.object({
  targetUserId: userIdSchema,
});

export const transferOwnershipBodySchema = z.object({
  newOwnerId: userIdSchema,
});

export const promoteMemberBodySchema = z.object({
  memberId: userIdSchema,
});

export const demoteMemberBodySchema = z.object({
  adminId: userIdSchema,
});

export const kickMemberBodySchema = z.object({
  memberId: userIdSchema,
});

export type CreateRoomBody = z.infer<typeof createRoomBodySchema>;
export type CreateDirectMessageRoomBody = z.infer<typeof createDirectMessageRoomBodySchema>;
export type TransferOwnershipBody = z.infer<typeof transferOwnershipBodySchema>;
export type PromoteMemberBody = z.infer<typeof promoteMemberBodySchema>;
export type DemoteMemberBody = z.infer<typeof demoteMemberBodySchema>;
export type KickMemberBody = z.infer<typeof kickMemberBodySchema>;