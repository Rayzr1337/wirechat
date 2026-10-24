import type { joinRoomSchema, userJoinedSchema } from '../protocol/schemas';
import { z } from 'zod';
import { AuthenticatedSocket } from '../server';
import { addSocketToRoom } from '../roomRegistry';
import { broadcastToRoom } from '../broadcast';
import { joinRoom } from '../../services/rooms.service';
import { roomRepository } from '../../repositories/room.repository';
import { AppError } from '../../middleware/error.middleware';

type JoinRoomMessage = z.infer<typeof joinRoomSchema>;
type userJoinedMessage = z.infer<typeof userJoinedSchema>;

export async function handleJoinRoom(userId: string, ws: AuthenticatedSocket, incomingMessage: JoinRoomMessage) {
    const roomId = incomingMessage.payload.roomId;

    if (ws.rooms?.has(roomId)) {
        return;
    }

    try {
        await joinRoom(userId, roomId);
    } catch (err) {
        const alreadyMember = err instanceof AppError && err.code === "ALREADY_MEMBER";
        const directMember = err instanceof AppError && err.code === "CANNOT_JOIN_DIRECT_ROOM"
            && await roomRepository.isMemberOfRoom(roomId, userId);
        if (!alreadyMember && !directMember) {
            throw err;
        }
    }

    const joinMsg: userJoinedMessage = {
        type: "USER_JOINED",
        payload: {
            roomId,
            userId,
            timestamp: new Date().toISOString()
        }
    };

    addSocketToRoom(roomId, ws);
    ws.rooms?.add(roomId);
    
    await broadcastToRoom(roomId, joinMsg);
}
        
    