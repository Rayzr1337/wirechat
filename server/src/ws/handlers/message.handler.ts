import type { inboundMessageSchema, outboundMessageSchema } from '../protocol/schemas';
import { z } from 'zod';
import { AuthenticatedSocket } from '../server';
import { broadcastToRoom } from '../broadcast';
import { sendMessage } from '../../services/messages.service';

type InboundMessage = z.infer<typeof inboundMessageSchema>;
type OutboundMessage = z.infer<typeof outboundMessageSchema>;

export async function handleMessage(userId: string, ws: AuthenticatedSocket, incomingMessage: InboundMessage) {
    const { message: msg, roomVersion } = await sendMessage(userId, incomingMessage.payload.roomId, incomingMessage.payload.content);
    const outMsg: OutboundMessage = {
        type: "MESSAGE",
        payload: {
            id: msg.id,
            roomId: msg.roomId,
            senderId: msg.senderId ?? "",
            content: msg.content,
            createdAt: msg.createdAt.toISOString(),
            editedAt: msg.editedAt ? msg.editedAt.toISOString() : null,
            roomVersion
        }
    };
    
    await broadcastToRoom(incomingMessage.payload.roomId, outMsg);

    await broadcastToRoom(incomingMessage.payload.roomId, {
        type: "TYPING",
        payload: {
            roomId: incomingMessage.payload.roomId,
            userId: msg.senderId ?? "",
            isTyping: false
        }
    }, msg.senderId ?? "");
}
