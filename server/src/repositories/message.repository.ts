import type { Message, Prisma, PrismaClient } from "../generated/prisma/client";
import { prisma } from "../libs/prisma";

class MessageRepository {
    async createMessage(data: Prisma.MessageCreateInput, roomId: string): Promise<{ message: Message; roomVersion: number }> {
        return prisma.$transaction(async (tx) => {
            const txClient = tx as unknown as PrismaClient;
            const message = await txClient.message.create({ data });
            const room = await txClient.room.update({
                where: { id: roomId },
                data: { version: { increment: 1 } },
            });
            return { message, roomVersion: room.version };
        });
    }

    async getMessageById(id: string): Promise<Message | null> {
        return prisma.message.findUnique({ where: { id } });
    }

    async updateMessage(id: string, data: Prisma.MessageUpdateInput): Promise<{ message: Message; roomVersion: number }> {
        return prisma.$transaction(async (tx) => {
            const txClient = tx as unknown as PrismaClient;
            const message = await txClient.message.update({ where: { id }, data });
            const room = await txClient.room.update({
                where: { id: message.roomId },
                data: { version: { increment: 1 } },
            });
            return { message, roomVersion: room.version };
        });
    }

    async deleteMessage(id: string): Promise<{ message: Message; roomVersion: number }> {
        return prisma.$transaction(async (tx) => {
            const txClient = tx as unknown as PrismaClient;
            const deleted = await txClient.message.delete({ where: { id } });
            const room = await txClient.room.update({
                where: { id: deleted.roomId },
                data: { version: { increment: 1 } },
            });
            return { message: deleted, roomVersion: room.version };
        });
    }

    async getMessagesByRoomId(roomId: string,
        options: {
            limit?: number;
            cursor?: string;
        } = {}
    ): Promise<(Message & { sender: { username: string; avatarUrl: string | null } | null })[]> {
        const { limit = 50, cursor } = options;

        return prisma.message.findMany({
            where: { roomId },
            take: limit,
            ...(cursor && { cursor: { id: cursor }, skip: 1 }),
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            include: { sender: { select: { username: true, avatarUrl: true } } },
        });
    }
}

export const messageRepository = new MessageRepository();
