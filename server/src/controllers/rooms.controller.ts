import type { Request, Response } from 'express';
import * as roomsService from '../services/rooms.service';
import type {
  CreateRoomBody,
  CreateDirectMessageRoomBody,
  TransferOwnershipBody,
  PromoteMemberBody,
  DemoteMemberBody,
  KickMemberBody,
} from '../schemas/room.schema';

export async function getUserRooms(req: Request, res: Response) {
    const userId = req.user!.userId;
    const rooms = await roomsService.getUserRooms(userId);
    res.json(rooms);
}

export async function getRoomMembers(req: Request<{ roomId: string }>, res: Response) {
    const roomId = req.params.roomId;
    const members = await roomsService.getRoomMembers(roomId);
    res.json(members);
}

export async function getRoomById(req: Request<{ roomId: string }>, res: Response) {
    const roomId = req.params.roomId;
    const room = await roomsService.getRoomById(roomId);
    res.json(room);
}

export async function createRoom(req: Request<{}, {}, CreateRoomBody>, res: Response) {
    const userId = req.user!.userId;
    const { roomName } = req.body;
    const newRoom = await roomsService.createGroupRoom(userId, roomName);
    res.status(201).json({ message: 'Room created successfully', room: newRoom });
}

export async function createDirectMessageRoom(req: Request<{}, {}, CreateDirectMessageRoomBody>, res: Response) {
    const userId = req.user!.userId;
    const { targetUserId } = req.body;
    const newRoom = await roomsService.createDirectRoom(userId, targetUserId);
    res.status(201).json({ message: 'Direct message room created successfully', room: newRoom });
}

export async function joinRoom(req: Request<{ roomId: string }>, res: Response) {
    const userId = req.user!.userId;
    const roomId = req.params.roomId;
    await roomsService.joinRoom(userId, roomId);
    res.status(200).json({ message: 'Joined room successfully' });
}

export async function leaveRoom(req: Request<{ roomId: string }>, res: Response) {
    const userId = req.user!.userId;
    const roomId = req.params.roomId;
    await roomsService.leaveRoom(userId, roomId);
    res.status(200).json({ message: 'Left room successfully' });
}

export async function transferOwnership(req: Request<{ roomId: string }, {}, TransferOwnershipBody>, res: Response) {
    const currentOwnerId = req.user!.userId;
    const roomId = req.params.roomId;
    const { newOwnerId } = req.body;
    await roomsService.transferOwnership(roomId, currentOwnerId, newOwnerId);
    res.status(200).json({ message: 'Ownership transferred successfully' });
}

export async function promoteMember(req: Request<{ roomId: string }, {}, PromoteMemberBody>, res: Response) {
    const ownerId = req.user!.userId;
    const roomId = req.params.roomId;
    const { memberId } = req.body;
    await roomsService.promoteMember(roomId, ownerId, memberId);
    res.status(200).json({ message: 'Member promoted successfully' });
}

export async function demoteMember(req: Request<{ roomId: string }, {}, DemoteMemberBody>, res: Response) {
    const ownerId = req.user!.userId;
    const roomId = req.params.roomId;
    const { adminId } = req.body;
    await roomsService.demoteMember(roomId, ownerId, adminId);
    res.status(200).json({ message: 'Member demoted successfully' });
}

export async function kickMember(req: Request<{ roomId: string }, {}, KickMemberBody>, res: Response) {
    const kickerId = req.user!.userId;
    const roomId = req.params.roomId;
    const { memberId } = req.body;
    await roomsService.kickMember(roomId, kickerId, memberId);
    res.status(200).json({ message: 'Member kicked successfully' });
}
