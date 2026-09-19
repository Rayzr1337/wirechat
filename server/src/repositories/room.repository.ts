import type { Room, Prisma, RoomMember, RoomMemberRole } from "../generated/prisma/client";
import { prisma } from "../libs/prisma";

class RoomRepository {
    async createRoom(data: Prisma.RoomCreateInput): Promise<Room> {
        return prisma.room.create({ data });
    }

    async getRoomById(id: string): Promise<Room | null> {
        return prisma.room.findUnique({ where: { id } });
    }

    async updateRoom(id: string, data: Prisma.RoomUpdateInput): Promise<Room> {
        return prisma.room.update({ where: { id }, data });
    }

    async deleteRoom(id: string): Promise<Room> {
        return prisma.room.delete({ where: { id } });
    }

    async findRoomByDirectKey(directKey: string): Promise<Room | null> {
        return prisma.room.findUnique({ where: { directKey } });
    }

    async getRoomMembers(roomId: string): Promise<RoomMember[]> {
        return prisma.roomMember.findMany({ where: { roomId }, include: { user: true } });
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

    async addMemberToRoom(roomId: string, userId: string, role: RoomMemberRole = "MEMBER"): Promise<RoomMember> {
        return prisma.roomMember.create({
            data: {
                roomId,
                userId,
                role,
            },
        });
    }
    
    async removeMemberFromRoom(roomId: string, userId: string): Promise<RoomMember> {
        return prisma.roomMember.delete({
            where: {
                roomId_userId: {
                    roomId,
                    userId,
                },
            },
        });
    }

    async changeRoomMemberRole(roomId: string, userId: string, newRole: RoomMemberRole): Promise<RoomMember> {
        return prisma.roomMember.update({
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