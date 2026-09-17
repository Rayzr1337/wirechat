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

export const errorSchema = z.object({
    type: z.literal("ERROR"),
    payload: z.object({ 
        code: z.enum(["INVALID_MESSAGE", "ROOM_NOT_FOUND", "USER_NOT_FOUND", "UNAUTHORIZED", "NOT_IN_ROOM"]),
        message: z.string().trim().min(1).max(200) })
});


export const incomingMessageSchema = z.discriminatedUnion("type", [
    joinRoomSchema,
    leaveRoomSchema,
    inboundMessageSchema,
    typingIndicatorSchema
]);

export const outgoingMessageSchema = z.discriminatedUnion("type", [
    outboundMessageSchema,
    userJoinedSchema,
    userLeftSchema,
    outboundTypingIndicatorSchema,
    presenceUpdateSchema,
    userUpdatedSchema,
    errorSchema
]);

export type IncomingMessage = z.infer<typeof incomingMessageSchema>;    
export type OutgoingMessage = z.infer<typeof outgoingMessageSchema>;

