import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "node:crypto";
import { userRepository } from "../repositories/user.repository";
import { AppError } from "../middleware/error.middleware";
import type { RegisterBody, LoginBody } from "../schemas/user.schema";
import { redisClient } from "../libs/redis";

const secret = process.env.JWT_SECRET;

export async function createUser(data: RegisterBody) {
  const { username, email, password } = data;

  if (await userRepository.getUserByUsername(username)) {
    throw new AppError(409, "CONFLICT", "Username already in use!");
  }
  if (await userRepository.getUserByEmail(email)) {
    throw new AppError(409, "CONFLICT", "Email already in use!");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  return userRepository.createUser({ username, email, passwordHash });
}

export async function loginUser(data: LoginBody) {
  const { email, password } = data;

  const user = await userRepository.getUserByEmail(email);
  if (!user) throw new AppError(401, "UNAUTHORIZED", "Invalid credentials!");

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) throw new AppError(401, "UNAUTHORIZED", "Invalid credentials!");

  return user;
}

export function issueToken(userId: string) {
  if (!secret) throw new Error("JWT Secret is not defined!");
  return jwt.sign({ userId }, secret, { expiresIn: "7d" });
}

export async function issueWsTicket(userId: string) {
  const ticket = crypto.randomUUID();
  await redisClient.set(`ticket:${ticket}`, userId, {
    EX: 10
  });

  return ticket;
}