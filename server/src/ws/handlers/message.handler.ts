import type { inboundMessageSchema, outboundMessageSchema } from '../protocol/schemas';
import { z } from 'zod';
import { AuthenticatedSocket } from '../server';
import { broadcastToRoom } from '../broadcast';
import { sendMessage } from '../../services/messages.service';

type InboundMessage = z.infer<typeof inboundMessageSchema>;
type OutboundMessage = z.infer<typeof outboundMessageSchema>;

export async function handleMessage(userId: string, ws: AuthenticatedSocket, incomingMessage: InboundMessage) {
    const msg = await sendMessage(userId, incomingMessage.payload.roomId, incomingMessage.payload.content);
    const outMsg: OutboundMessage = {
        type: "MESSAGE",
        payload: {
            id: msg.id,
            roomId: msg.roomId,
            senderId: msg.senderId ?? "",
            content: msg.content,
            createdAt: msg.createdAt.toISOString()
        }
    };
    
    await broadcastToRoom(incomingMessage.payload.roomId, outMsg);
}