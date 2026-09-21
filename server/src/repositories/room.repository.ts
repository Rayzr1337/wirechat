import type { Room, Prisma, PrismaClient, RoomMember, RoomMemberRole } from "../generated/prisma/client";
import { prisma } from "../libs/prisma";

export type client = PrismaClient | Prisma.TransactionClient;

class RoomRepository {
    async createRoom(data: Prisma.RoomCreateInput, thisClient: client = prisma): Promise<Room> {
        return thisClient.room.create({ data });
    }

    async getRoomById(id: string, thisClient: client = prisma): Promise<Room | null> {
        return thisClient.room.findUnique({ where: { id } });
    }

    async getUserRooms(userId: string, thisClient: client = prisma) : Promise<{ room: Room; role: RoomMemberRole }[]> {
        return thisClient.roomMember.findMany({ where: { userId }, include: { room: true } });
    }

    async updateRoom(id: string, data: Prisma.RoomUpdateInput, thisClient: client = prisma): Promise<Room> {
        return thisClient.room.update({ where: { id }, data });
    }

    async deleteRoom(id: string, thisClient: client = prisma): Promise<Room> {
        return thisClient.room.delete({ where: { id } });
    }

    async findRoomByDirectKey(directKey: string): Promise<Room | null> {
        return prisma.room.findUnique({ where: { directKey } });
    }

    async getRoomMembers(roomId: string, thisClient: client = prisma): Promise<RoomMember[]> {
        return thisClient.roomMember.findMany({ where: { roomId }, include: { user: true } });
    }

    async isMemberOfRoom(roomId: string, userId: string): Promise<boolean> {
        const member = await prisma.roomMember.findUnique({
            where: {
                roomId_userId: {
                    roomId,
                    userId,
                },
            },
        });
        return member !== null;
    }

    async addMemberToRoom(roomId: string, userId: string, role: RoomMemberRole = "MEMBER", thisClient: client = prisma): Promise<RoomMember> {
        return thisClient.roomMember.create({
            data: {
                roomId,
                userId,
                role,
            },
        });
    }
    
    async removeMemberFromRoom(roomId: string, userId: string, thisClient: client = prisma): Promise<RoomMember> {
        return thisClient.roomMember.delete({
            where: {
                roomId_userId: {
                    roomId,
                    userId,
                },
            },
        });
    }

    async changeRoomMemberRole(roomId: string, userId: string, newRole: RoomMemberRole, thisClient: client = prisma): Promise<RoomMember> {
        return thisClient.roomMember.update({
            where: {
                roomId_userId: {
                    roomId,
                    userId,
                },
            },
            data: {
                role: newRole,
            },
        });
    }

}

export const roomRepository = new RoomRepository();