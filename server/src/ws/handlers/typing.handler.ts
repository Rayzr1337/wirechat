import { typingIndicatorSchema, outboundTypingIndicatorSchema } from "../protocol/schemas";
import { z } from 'zod';
import { AuthenticatedSocket } from '../server';
import { broadcastToRoom } from '../broadcast';

type TypingIndicator = z.infer<typeof typingIndicatorSchema>;
type OutboundTypingIndicator = z.infer<typeof outboundTypingIndicatorSchema>;

export async function handleTypingIndicator(userId: string, ws: AuthenticatedSocket, incomingMessage: TypingIndicator) {
    const outMsg: OutboundTypingIndicator = {
        type: "TYPING",
        payload: {
            roomId: incomingMessage.payload.roomId,
            userId
        }
    };

    await broadcastToRoom(incomingMessage.payload.roomId, outMsg, userId);
}; 