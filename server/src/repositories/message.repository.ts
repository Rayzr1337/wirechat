import type { Message, Prisma, PrismaClient } from "../generated/prisma/client";
import { prisma } from "../libs/prisma";

class MessageRepository {
    async createMessage(data: Prisma.MessageCreateInput, roomId: string): Promise<Message> {
        return prisma.$transaction(async (tx) => {
            const txClient = tx as unknown as PrismaClient;
            const message = await txClient.message.create({ data });
            await txClient.room.update({
                where: { id: roomId },
                data: { version: { increment: 1 } },
            });
            return message;
        });
    }

    async getMessageById(id: string): Promise<Message | null> {
        return prisma.message.findUnique({ where: { id } });
    }

    async updateMessage(id: string, data: Prisma.MessageUpdateInput): Promise<Message> {
        return prisma.message.update({
            where: { id },
            data: {
                ...data,
                room: {
                    update: {
                        version: { increment: 1 },
                    },
                },
            },
        });
    }

    async deleteMessage(id: string, roomId: string): Promise<Message> {
        return prisma.$transaction(async (tx) => {
            const txClient = tx as unknown as PrismaClient;
            const deleted = await txClient.message.delete({ where: { id } });
            await txClient.room.update({
                where: { id: roomId },
                data: { version: { increment: 1 } },
            });
            return deleted;
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
            orderBy: { createdAt: "desc" },
            include: { sender: { select: { username: true, avatarUrl: true } } },
        });
    }
}

export const messageRepository = new MessageRepository();
