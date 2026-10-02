import type { leaveRoomSchema, userLeftSchema } from '../protocol/schemas';
import { z } from 'zod';
import { AuthenticatedSocket } from '../server';
import { removeSocketFromRoom } from '../roomRegistry';
import { broadcastToRoom } from '../broadcast';
import { leaveRoom } from '../../services/rooms.service';
import { AppError } from '../../middleware/error.middleware';

type leaveRoomMessage = z.infer<typeof leaveRoomSchema>;
type userLeftMessage = z.infer<typeof userLeftSchema>;

export async function handleLeaveRoom(userId: string, ws: AuthenticatedSocket, incomingMessage: leaveRoomMessage) {
    const roomId = incomingMessage.payload.roomId;

    if (!ws.rooms?.has(roomId)) {
        return;
    }

    try {
        await leaveRoom(userId, roomId);
    } catch (err) {
        if (!(err instanceof AppError) || err.code !== "NOT_IN_ROOM") {
            throw err;
        }
    }

    const leaveMsg: userLeftMessage = {
        type: "USER_LEFT",
        payload: {
            roomId,
            userId,
            timestamp: new Date().toISOString()
        }
    };

    removeSocketFromRoom(roomId, ws);
    ws.rooms?.delete(roomId);

    await broadcastToRoom(roomId, leaveMsg);
}