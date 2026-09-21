import { z } from "zod";

// Inbound messages:
export const joinRoomSchema = z.object({
    type: z.literal("JOIN_ROOM"),
    payload: z.object({ roomId: z.uuid() }),
});

export const leaveRoomSchema = z.object({
    type: z.literal("LEAVE_ROOM"),
    payload: z.object({ roomId: z.uuid() }),
});

export const inboundMessageSchema = z.object({
    type: z.literal("MESSAGE"),
    payload: z.object({ roomId: z.uuid(), content: z.string().trim().min(1).max(2000) })
});

export const typingIndicatorSchema = z.object({
    type: z.literal("TYPING"),
    payload: z.object({ roomId: z.uuid() })
});

export const editMessageSchema = z.object({
    type: z.literal("EDIT_MESSAGE"),
    payload: z.object({ messageId: z.uuid(), content: z.string().trim().min(1).max(2000) })
});

export const deleteMessageSchema = z.object({
    type: z.literal("DELETE_MESSAGE"),
    payload: z.object({ messageId: z.uuid() })
});

// Outbound messages:
export const outboundMessageSchema = z.object({
    type: z.literal("MESSAGE"),
    payload: z.object({ 
        id: z.uuid(),
        roomId: z.uuid(),
        senderId: z.uuid(), 
        content: z.string().trim().min(1).max(2000),
        createdAt: z.iso.datetime()
    })
});

export const userJoinedSchema = z.object({
    type: z.literal("USER_JOINED"),
    payload: z.object({ roomId: z.uuid(), userId: z.uuid(), timestamp: z.iso.datetime() })
});

export const userLeftSchema = z.object({
    type: z.literal("USER_LEFT"),
    payload: z.object({ roomId: z.uuid(), userId: z.uuid(), timestamp: z.iso.datetime() })
});

export const outboundTypingIndicatorSchema = z.object({
    type: z.literal("TYPING"),
    payload: z.object({ roomId: z.uuid(), userId: z.uuid() })
});

export const presenceUpdateSchema = z.object({
    type: z.literal("PRESENCE_UPDATE"),
    payload: z.object({ userId: z.uuid(), isOnline: z.boolean() })
});

export const userUpdatedSchema = z.object({
    type: z.literal("USER_UPDATED"),
    payload: z.object({ userId: z.uuid(), 
        username: z.string().trim().min(1).max(50).optional(),
        avatarUrl: z.url().optional() }).refine(
        (data) => data.username !== undefined || data.avatarUrl !== undefined,
        { message: "At least one of username or avatarUrl must be provided" }
    ),
});

export const messageEditedSchema = z.object({
    type: z.literal("MESSAGE_EDITED"),
    payload: z.object({ 
        id: z.uuid(),
        roomId: z.uuid(),
        content: z.string().trim().min(1).max(2000),
        editedAt: z.iso.datetime()
    })
});

export const messageDeletedSchema = z.object({
    type: z.literal("MESSAGE_DELETED"),
    payload: z.object({ 
        id: z.uuid(),
        roomId: z.uuid()
    })
});

export const errorCodeList = [
  "INVALID_MESSAGE",
  "ROOM_NOT_FOUND",
  "USER_NOT_FOUND",
  "MESSAGE_NOT_FOUND",
  "UNAUTHORIZED",
  "NOT_IN_ROOM",
  "EMAIL_NOT_VERIFIED",
  "CONFLICT",
  "INVALID_TOKEN",
  "ALREADY_ADMIN",
  "NOT_ADMIN",
  "NOT_FOUND",
  "FORBIDDEN",
  "BAD_REQUEST",
  "ALREADY_VERIFIED",
  "VALIDATION_ERROR",
  "CANNOT_LEAVE_DIRECT_ROOM",
  "CANNOT_KICK_FROM_DIRECT_ROOM",
  "CANNOT_JOIN_DIRECT_ROOM",
  "ALREADY_MEMBER",
  "CANNOT_CREATE_DIRECT_ROOM_WITH_SELF",
  "GROUP_ROOM_REQUIRED",
  "CANNOT_PROMOTE_SELF",
  "CANNOT_KICK_SELF",
  "CANNOT_TRANSFER_TO_SELF",
  "OWNER_REQUIRED",
  "ADMIN_OR_OWNER_REQUIRED",
  "CANNOT_KICK_OWNER",
  "CANNOT_KICK_ADMIN",
  "ALREADY_OWNER",
] as const;

export type ErrorCode = typeof errorCodeList[number];

export const errorSchema = z.object({
    type: z.literal("ERROR"),
    payload: z.object({ 
        code: z.enum(errorCodeList),
        message: z.string().trim().min(1).max(200) })
});


export const incomingMessageSchema = z.discriminatedUnion("type", [
    joinRoomSchema,
    leaveRoomSchema,
    inboundMessageSchema,
    typingIndicatorSchema,
    editMessageSchema,
    deleteMessageSchema
]);

export const outgoingMessageSchema = z.discriminatedUnion("type", [
    outboundMessageSchema,
    userJoinedSchema,
    userLeftSchema,
    outboundTypingIndicatorSchema,
    presenceUpdateSchema,
    userUpdatedSchema,
    messageEditedSchema,
    messageDeletedSchema,
    errorSchema
]);

export type IncomingMessage = z.infer<typeof incomingMessageSchema>;    
export type OutgoingMessage = z.infer<typeof outgoingMessageSchema>;

