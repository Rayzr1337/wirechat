import type { leaveRoomSchema, userLeftSchema } from '../protocol/schemas';
import { z } from 'zod';
import { AuthenticatedSocket } from '../server';
import { removeSocketFromRoom } from '../roomRegistry';
import { broadcastToRoom } from '../broadcast';
import { leaveRoom } from '../../services/rooms.service';

type leaveRoomMessage = z.infer<typeof leaveRoomSchema>;
type userLeftMessage = z.infer<typeof userLeftSchema>;

export async function handleLeaveRoom(userId: string, ws: AuthenticatedSocket, incomingMessage: leaveRoomMessage) {
    await leaveRoom(userId, incomingMessage.payload.roomId);
    const leaveMsg: userLeftMessage = {
        type: "USER_LEFT",
        payload: {
            roomId: incomingMessage.payload.roomId,
            userId,
            timestamp: new Date().toISOString()
        }
    };

    removeSocketFromRoom(incomingMessage.payload.roomId, ws);
    ws.rooms?.delete(incomingMessage.payload.roomId);

    await broadcastToRoom(incomingMessage.payload.roomId, leaveMsg);
}