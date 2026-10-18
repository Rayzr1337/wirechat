import type { User, Prisma } from "../generated/prisma/client";
import { prisma } from "../libs/prisma";

export class UserRepository {
    async createUser(data: Prisma.UserCreateInput): Promise<User> {
        return prisma.user.create({ data });
    }

    async getUserById(id: string): Promise<User | null> {
        return prisma.user.findUnique({ where: { id } });
    }

    async getUserByUsername(username: string): Promise<User | null> {
        return prisma.user.findUnique({ where: { username } });
    }

    async getUserByEmail(email: string): Promise<User | null> {
        return prisma.user.findUnique({ where: { email } });
    }
    
    async getUserByVerificationToken(token: string): Promise<User | null> {
        return prisma.user.findUnique({ where: { emailVerificationToken: token } });
    }

    async updateUser(id: string, data: Prisma.UserUpdateInput): Promise<User> {
        return prisma.user.update({ where: { id }, data });
    }

    async deleteUser(id: string): Promise<User> {
        return prisma.user.delete({ where: { id } });
    }

    async searchUsers(query: string, excludingUserId: string): Promise<User[]> {
        return prisma.user.findMany({
            where: {
                AND: [
                    { id: { not: excludingUserId } },
                    {
                        OR: [
                            { username: { contains: query, mode: "insensitive" } },
                            { email: { contains: query, mode: "insensitive" } },
                        ],
                    },
                ],
            },
            select: {
                id: true,
                username: true,
                avatarUrl: true,
            },
            take: 20,
        });
    }
}

export const userRepository = new UserRepository();