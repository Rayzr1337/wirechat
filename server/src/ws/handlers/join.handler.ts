import type { joinRoomSchema, userJoinedSchema } from '../protocol/schemas';
import { z } from 'zod';
import { AuthenticatedSocket } from '../server';
import { addSocketToRoom } from '../roomRegistry';
import { broadcastToRoom } from '../broadcast';
import { joinRoom } from '../../services/rooms.service';

type JoinRoomMessage = z.infer<typeof joinRoomSchema>;
type userJoinedMessage = z.infer<typeof userJoinedSchema>;

export async function handleJoinRoom(userId: string, ws: AuthenticatedSocket, incomingMessage: JoinRoomMessage) {
    await joinRoom(userId, incomingMessage.payload.roomId);
    const joinMsg: userJoinedMessage = {
        type: "USER_JOINED",
        payload: {
            roomId: incomingMessage.payload.roomId,
            userId,
            timestamp: new Date().toISOString()
        }
    };

    addSocketToRoom(incomingMessage.payload.roomId, ws);
    ws.rooms?.add(incomingMessage.payload.roomId);
    
    await broadcastToRoom(incomingMessage.payload.roomId, joinMsg);
}
        
    