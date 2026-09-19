import type {  Message, Prisma } from "../generated/prisma/client";
import { prisma } from "../libs/prisma";

class MessageRepository {
    async createMessage(data: Prisma.MessageCreateInput): Promise<Message> {
        return prisma.message.create({ data });
    }

    async getMessageById(id: string): Promise<Message | null> {
        return prisma.message.findUnique({ where: { id } });
    }
        
    async updateMessage(id: string, data: Prisma.MessageUpdateInput): Promise<Message> {
        return prisma.message.update({ where: { id }, data });
    }                       

    async deleteMessage(id: string): Promise<Message> {
        return prisma.message.delete({ where: { id } });
    }

    async getMessagesByRoomId(roomId: string, 
        options: {
            limit?: number;
            cursor?: string;
        } = {}
    ): Promise<Message[]> {
        const { limit = 50, cursor } = options;

        return prisma.message.findMany({
            where: { roomId },
            take: limit,
            ...(cursor && { cursor: { id: cursor }, skip: 1 }),
            orderBy: { createdAt: "desc" },
        });
    }
}

export const messageRepository = new MessageRepository();   