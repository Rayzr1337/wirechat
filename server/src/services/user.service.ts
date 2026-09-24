import { userRepository } from "../repositories/user.repository";
import { AppError } from "../middleware/error.middleware";
import { redisClient } from "../libs/redis";
import { z } from "zod";
import bcrypt  from "bcrypt";
import crypto from "node:crypto";

import { broadcastToRoom } from "../ws/broadcast";
import { userUpdatedSchema } from "../ws/protocol/schemas";
import { roomRepository } from "../repositories/room.repository";

type userUpdatedMessage = z.infer<typeof userUpdatedSchema>;

//crud operations for user
export async function getUserById(id: string) {
    const user = await userRepository.getUserById(id);
    if (!user) {
        throw new AppError(404, "USER_NOT_FOUND", "User not found!");
    }
    return user;
}

export async function getUserByUsername(username: string) {
    const user = await userRepository.getUserByUsername(username);
    if (!user) {
        throw new AppError(404, "USER_NOT_FOUND", "User not found!");
    }
    return user;
}  

export async function getUserByEmail(email: string) { 
    const user = await userRepository.getUserByEmail(email);
    if (!user) {
        throw new AppError(404, "USER_NOT_FOUND", "User not found!");
    }
    return user;
}

export async function updateUser(id: string, data: { username?: string; avatarUrl?: string }) {
    const user = await userRepository.getUserById(id);
    if (!user) {
        throw new AppError(404, "USER_NOT_FOUND", "User not found!");
    }

    if (data.username && data.username !== user.username) {
        const existing = await userRepository.getUserByUsername(data.username);
        if (existing) {
        throw new AppError(409, "CONFLICT", "Username already in use!");
        }
    }

    const updated = await userRepository.updateUser(id, data); 
    if (data.username && data.username !== user.username 
        || data.avatarUrl && data.avatarUrl !== user.avatarUrl) {
        const updatedPayload: userUpdatedMessage = {
        type: "USER_UPDATED",
        payload: {
            userId: user.id,
            username: updated.username ?? undefined,
        },
        };

        const memberships = await roomRepository.getRoomsForUser(id);
        for (const membership of memberships) {
        await broadcastToRoom(membership.roomId, updatedPayload);
        }
    }

    return updated;
}

export async function changePassword(id: string, oldPassword: string, newPassword: string) {
    const user = await userRepository.getUserById(id);
    if (!user) {
        throw new AppError(404, "USER_NOT_FOUND", "User not found!");
    }
    
    if (!await bcrypt.compare(oldPassword, user.passwordHash)) {
        throw new AppError(401, "UNAUTHORIZED", "Invalid credentials!");
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    return userRepository.updateUser(id, { passwordHash: newPasswordHash });
};

export async function deleteUser(id: string) {
    const user = await userRepository.getUserById(id);
    if (!user) {
        throw new AppError(404, "USER_NOT_FOUND", "User not found!");
    }
    return userRepository.deleteUser(id);
}

//email verification

export async function initiateEmailVerification(userId: string) {
    const user = await userRepository.getUserById(userId);
    if (!user) {
    throw new AppError(404, "USER_NOT_FOUND", "User not found!");
    }

    if (user.emailVerified && !user.pendingEmail) {
        throw new AppError(400, "ALREADY_VERIFIED", "Email is already verified.");
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await userRepository.updateUser(userId, {
        emailVerificationToken: token, 
        emailVerificationExpiresAt: expiresAt 
    });

    //email service sends email
    return token;
}

export async function requestEmailChange(userId: string, newEmail: string) {
    const user = await userRepository.getUserById(userId);
    if (!user) {
        throw new AppError(404, "USER_NOT_FOUND", "User not found!");
    }

    const existing = await userRepository.getUserByEmail(newEmail);
    if (existing) {
        throw new AppError(409, "CONFLICT", "Email already in use!");
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await userRepository.updateUser(userId, {
        emailVerificationToken: token,
        emailVerificationExpiresAt: expiresAt,
        emailVerified: false,
        pendingEmail: newEmail
    });
    
    //email service sends email
    return token;
}

export async function verifyEmail(token: string) {
    const user = await userRepository.getUserByVerificationToken(token);

    if (!user || !user.emailVerificationExpiresAt || user.emailVerificationExpiresAt < new Date()) {
        throw new AppError(400, "INVALID_TOKEN", "Invalid or expired verification token.");
    }

    const updated = await userRepository.updateUser(user.id, {
        email: user.pendingEmail ?? user.email,
        pendingEmail: null,
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiresAt: null,
    });

    await redisClient.del(`verified:${user.id}`);

    return updated;
};
