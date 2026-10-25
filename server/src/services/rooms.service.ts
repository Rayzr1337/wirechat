import { roomRepository, type client } from '../repositories/room.repository';
import { userRepository } from '../repositories/user.repository';
import { AppError } from "../middleware/error.middleware";
import { prisma } from '../libs/prisma';
import { redisClient } from '../libs/redis';
import { broadcastToUser, broadcastSocketLeave, broadcastToRoom } from '../ws/broadcast';
import { RoomMember } from '../generated/prisma/client';

export async function getUserRooms(userId: string) {
    const user = await userRepository.getUserById(userId);
    if (!user) {
        throw new AppError(404, "USER_NOT_FOUND", "User not found!");
    }
    
    const memberships = await roomRepository.getUserRooms(userId);
    return memberships.map((m) => ({
        ...m.room,
        myRole: m.role,
        unreadCount: m.unreadCount,
        members: m.room.type === "DIRECT"
            ? m.room.members.map((mm) => ({ userId: mm.userId, username: mm.user.username, avatarUrl: mm.user.avatarUrl }))
            : [],
    }));
}

export async function getRoomMembers(roomId: string, requestingUserId: string) {
    const room = await roomRepository.getRoomById(roomId);
    if (!room) {
        throw new AppError(404, "ROOM_NOT_FOUND", "Room not found!");
    }

    const isMember = await roomRepository.isMemberOfRoom(roomId, requestingUserId);
    if (!isMember) {
        throw new AppError(403, "NOT_IN_ROOM", "User is not a member of this room.");
    }

    return roomRepository.getRoomMembers(roomId);
}

export async function getRoomPresences(roomId: string, requestingUserId: string) {
    const room = await roomRepository.getRoomById(roomId);
    if (!room) {
        throw new AppError(404, "ROOM_NOT_FOUND", "Room not found!");
    }

    const isMember = await roomRepository.isMemberOfRoom(roomId, requestingUserId);
    if (!isMember) {
        throw new AppError(403, "NOT_IN_ROOM", "User is not a member of this room.");
    }

    const members = await roomRepository.getRoomMembers(roomId);
    const userIds = members.map(m => m.userId);

    const onlineStates = await Promise.all(
        userIds.map((id) => redisClient.sCard(`presence:sockets:${id}`))
    );

    const heartbeats = await redisClient.zmScore('presence:heartbeats', userIds);

    return members.map((member, i) => ({
        userId: member.userId,
        username: member.user.username,
        avatarUrl: member.user.avatarUrl,
        role: member.role,
        isOnline: onlineStates[i] > 0,
        lastSeen: heartbeats[i] ? new Date(heartbeats[i]).toISOString() : null,
    }));
}

export async function getRoomById(roomId: string, requestingUserId: string) {
    const room = await roomRepository.getRoomById(roomId);
    if (!room) {
        throw new AppError(404, "ROOM_NOT_FOUND", "Room not found!");
    }

    const isMember = await roomRepository.isMemberOfRoom(roomId, requestingUserId);
    if (!isMember) {
        throw new AppError(403, "NOT_IN_ROOM", "User is not a member of this room.");
    }

    await roomRepository.resetUnreadCount(roomId, requestingUserId);

    return room;
}

export async function createGroupRoom(creatorId: string, roomName: string) {
    const creator = await userRepository.getUserById(creatorId);
    if (!creator) {
        throw new AppError(404, "USER_NOT_FOUND", "Creator not found!");
    }

    if (!creator.emailVerified) {
        throw new AppError(403, "EMAIL_NOT_VERIFIED", "Email not verified.");
    }

    const room = await roomRepository.createRoom({ name: roomName, type: "GROUP" });
    await roomRepository.addMemberToRoom(room.id, creatorId, "OWNER");
    return room;
}

export async function createDirectRoom(userId1: string, userId2: string) {
    if (userId1 === userId2) {
        throw new AppError(400, "CANNOT_CREATE_DIRECT_ROOM_WITH_SELF", "Cannot create a direct room with the same user.");
    }

    const user1 = await userRepository.getUserById(userId1);
    const user2 = await userRepository.getUserById(userId2);

    if (!user1 || !user2) {
        throw new AppError(404, "USER_NOT_FOUND", "One or both users not found!");
    }

    if (!user1.emailVerified || !user2.emailVerified) {
        throw new AppError(403, "EMAIL_NOT_VERIFIED", "Email not verified.");
    }

    const directKey = [userId1, userId2].sort().join('_');

    const existingRoom = await roomRepository.findRoomByDirectKey(directKey);
    if (existingRoom) {
        return existingRoom;
    }

    return await prisma.$transaction(async (tx) => { 
        const room = await roomRepository.createRoom({ type: "DIRECT", directKey: directKey }, tx);
        await roomRepository.addMemberToRoom(room.id, userId1, "MEMBER", tx);
        await roomRepository.addMemberToRoom(room.id, userId2, "MEMBER", tx);
        await broadcastToUser(userId2, {
            type: "DIRECT_ROOM_CREATED",
            payload: { roomId: room.id, withUserId: userId1, timestamp: new Date().toISOString() },
        });
        return room;
    });
}

export async function joinRoom(userId: string, roomId: string) {
    const user = await userRepository.getUserById(userId);
    if (!user) {
        throw new AppError(404, "USER_NOT_FOUND", "User not found!");
    }

    if (!user.emailVerified) {
        throw new AppError(403, "EMAIL_NOT_VERIFIED", "Email not verified.");
    }

    const room = await roomRepository.getRoomById(roomId);
    if (!room) {
        throw new AppError(404, "ROOM_NOT_FOUND", "Room not found!");
    }

    if (room.type === "DIRECT") {
        throw new AppError(400, "CANNOT_JOIN_DIRECT_ROOM", "Cannot join a direct room.");
    }

    const isMember = await roomRepository.isMemberOfRoom(roomId, userId);
    if (isMember) {
        throw new AppError(400, "ALREADY_MEMBER", "User is already a member of the room.");
    }

    return await roomRepository.addMemberToRoom(roomId, userId);
}

export async function leaveRoom(userId: string, roomId: string) {
    const user = await userRepository.getUserById(userId);
    if (!user) {
        throw new AppError(404, "USER_NOT_FOUND", "User not found!");
    }
    
    const room = await roomRepository.getRoomById(roomId);
    if (!room) {
        throw new AppError(404, "ROOM_NOT_FOUND", "Room not found!");
    }

    const isMember = await roomRepository.isMemberOfRoom(roomId, userId);
    if (!isMember) {
        throw new AppError(400, "NOT_IN_ROOM", "User is not a member of the room.");
    }

    if (room.type === "DIRECT") {
        throw new AppError(400, "CANNOT_LEAVE_DIRECT_ROOM", "Cannot leave a direct room.");
    }

    return prisma.$transaction(async (tx) => {
        const members = await roomRepository.getRoomMembers(roomId, tx);
        const isLastMember = members.length === 1;

        if (isLastMember) {
            await roomRepository.deleteRoom(roomId, tx);
            await redisClient.publish(`room_deleted:${roomId}`, JSON.stringify({ roomId }));
            return { message: "Room deleted as it had no more members." };
        }

        const member = members.find((m) => m.userId === userId);
        if (member?.role === "OWNER") {
            await transferOwnershipLeave(roomId, userId, members, tx);
        }

        await roomRepository.removeMemberFromRoom(roomId, userId, tx);
        await broadcastToRoom(roomId, {
            type: "USER_LEFT",
            payload: {
                roomId,
                userId,
                timestamp: new Date().toISOString(),
            },
        }, userId);
        await broadcastSocketLeave(roomId, userId);
        return { message: "User has left the room." };
    });
}

export async function transferOwnership(roomId: string, currentOwnerId: string, newOwnerId: string) {
    const room = await roomRepository.getRoomById(roomId);
    if (!room) {
        throw new AppError(404, "ROOM_NOT_FOUND", "Room not found!");
    }

    if (room.type !== "GROUP") {
        throw new AppError(400, "GROUP_ROOM_REQUIRED", "Ownership transfer only applies to group rooms.");
    }

    const members = await roomRepository.getRoomMembers(roomId);
    const currentOwner = members.find((m) => m.userId === currentOwnerId);
    const target = members.find((m) => m.userId === newOwnerId);

    if (currentOwner?.role !== "OWNER") {
        throw new AppError(403, "OWNER_REQUIRED", "Only the current owner can transfer ownership.");
    }

    if (!target) {
        throw new AppError(400, "NOT_IN_ROOM", "Target user is not a member of this room.");
    }

    if (newOwnerId === currentOwnerId) {
        throw new AppError(400, "CANNOT_TRANSFER_TO_SELF", "User is already the owner.");
    }

    return prisma.$transaction(async (tx) => {
        await roomRepository.changeRoomMemberRole(roomId, currentOwnerId, "ADMIN", tx);
        await roomRepository.changeRoomMemberRole(roomId, newOwnerId, "OWNER", tx);
    });
}

export async function promoteMember(roomId: string, ownerId: string, memberId: string) {
    if (memberId === ownerId) {
        throw new AppError(400, "CANNOT_PROMOTE_SELF", "Cannot promote yourself.");
    }

    const room = await roomRepository.getRoomById(roomId);
    if (!room) {
        throw new AppError(404, "ROOM_NOT_FOUND", "Room not found!");
    }
    
    if (room.type !== "GROUP") {
        throw new AppError(400, "GROUP_ROOM_REQUIRED", "Promotion only applies to group rooms.");
    }

    const members = await roomRepository.getRoomMembers(roomId);
    const owner = members.find((m) => m.userId === ownerId);
    const target = members.find((m) => m.userId === memberId);

    if (owner?.role !== "OWNER") {
        throw new AppError(403, "OWNER_REQUIRED", "Only the owner can promote members.");
    }
    
    if (!target) {
        throw new AppError(400, "NOT_IN_ROOM", "Target user is not a member of this room.");
    }

    if (target.role === "ADMIN") {
        throw new AppError(400, "ALREADY_ADMIN", "User is already an admin.");
    }

    return roomRepository.changeRoomMemberRole(roomId, memberId, "ADMIN");
}

export async function demoteMember(roomId: string, ownerId: string, adminId: string) {
    const room = await roomRepository.getRoomById(roomId);
    if (!room) {
        throw new AppError(404, "ROOM_NOT_FOUND", "Room not found!");
    }
    
    if (room.type !== "GROUP") {
        throw new AppError(400, "GROUP_ROOM_REQUIRED", "Demotion only applies to group rooms.");
    }
    
    const members = await roomRepository.getRoomMembers(roomId);
    const owner = members.find((m) => m.userId === ownerId);
    const target = members.find((m) => m.userId === adminId);

    if (owner?.role !== "OWNER") {
        throw new AppError(403, "OWNER_REQUIRED", "Only the owner can demote admins.");
    }
    
    if (!target) {
        throw new AppError(400, "NOT_IN_ROOM", "Target user is not a member of this room.");
    }
    
    if (target.role !== "ADMIN") {
        throw new AppError(400, "NOT_ADMIN", "User is not an admin.");
    }

    return roomRepository.changeRoomMemberRole(roomId, adminId, "MEMBER");
}

export async function kickMember(roomId: string, kickerId: string, memberId: string) {
    if (kickerId === memberId) {
        throw new AppError(400, "CANNOT_KICK_SELF", "Cannot kick yourself.");
    }

    const room = await roomRepository.getRoomById(roomId);
    if (!room) {
        throw new AppError(404, "ROOM_NOT_FOUND", "Room not found!");
    }
    
    if (room.type !== "GROUP") {
        throw new AppError(400, "CANNOT_KICK_FROM_DIRECT_ROOM", "Kicking members only applies to group rooms.");
    }
    
    const members = await roomRepository.getRoomMembers(roomId);
    const kicker = members.find((m) => m.userId === kickerId);
    const target = members.find((m) => m.userId === memberId);

    if (!kicker || (kicker.role !== "OWNER" && kicker.role !== "ADMIN")) {
        throw new AppError(403, "ADMIN_OR_OWNER_REQUIRED", "Only the owner or an admin can kick members.");
    }

    if (!target) {
        throw new AppError(400, "NOT_IN_ROOM", "Target user is not a member of this room.");
    }

    if (target.role === "OWNER") {
        throw new AppError(403, "CANNOT_KICK_OWNER", "Cannot kick the owner of the room.");
    }

    if (kicker.role === "ADMIN" && target.role === "ADMIN") {
        throw new AppError(403, "CANNOT_KICK_ADMIN", "Admins cannot kick other admins.");
    }
    
    return roomRepository.removeMemberFromRoom(roomId, memberId).then(async () => {
        await broadcastToRoom(roomId, {
            type: "USER_LEFT",
            payload: {
                roomId,
                userId: memberId,
                timestamp: new Date().toISOString(),
            },
        }, memberId);
        await broadcastSocketLeave(roomId, memberId);
        await broadcastToUser(memberId, {
            type: "USER_LEFT",
            payload: {
                roomId,
                userId: memberId,
                timestamp: new Date().toISOString(),
            },
        });
    });
}

export async function destroyRoom(roomId: string, requesterId: string) {
    const room = await roomRepository.getRoomById(roomId);
    if (!room) {
        throw new AppError(404, "ROOM_NOT_FOUND", "Room not found!");
    }

    if (room.type !== "GROUP") {
        throw new AppError(400, "CANNOT_DELETE_DIRECT_ROOM", "Direct rooms cannot be deleted.");
    }

    const members = await roomRepository.getRoomMembers(roomId);
    const requester = members.find((m) => m.userId === requesterId);

    if (requester?.role !== "OWNER") {
        throw new AppError(403, "OWNER_REQUIRED", "Only the owner can delete the room.");
    }

    for (const member of members) {
        await broadcastToUser(member.userId, {
            type: "ROOM_DELETED",
            payload: { roomId },
        });
    }

    return roomRepository.deleteRoom(roomId);
}

export async function updateRoomName(roomId: string, requestingUserId: string, name: string) {
    const room = await roomRepository.getRoomById(roomId);
    if (!room) {
        throw new AppError(404, "ROOM_NOT_FOUND", "Room not found!");
    }

    const isMember = await roomRepository.isMemberOfRoom(roomId, requestingUserId);
    if (!isMember) {
        throw new AppError(403, "NOT_IN_ROOM", "User is not a member of this room.");
    }

    const members = await roomRepository.getRoomMembers(roomId);
    const member = members.find((m) => m.userId === requestingUserId);
    if (member?.role !== "OWNER" && member?.role !== "ADMIN") {
        throw new AppError(403, "ADMIN_OR_OWNER_REQUIRED", "Only the owner or an admin can update the room name.");
    }

    return roomRepository.updateRoom(roomId, { name });
}

//helpers:

async function transferOwnershipLeave(roomId: string, excludingUserId: string, members: RoomMember[], tx: client): Promise<void> {
    const candidates = members.filter((m) => m.userId !== excludingUserId);

    if (candidates.length === 0) {
        return; 
    }

    const admin = candidates.find((m) => m.role === "ADMIN");
    const newOwner = admin ?? candidates[Math.floor(Math.random() * candidates.length)];

    await roomRepository.changeRoomMemberRole(roomId, newOwner.userId, "OWNER", tx);
}