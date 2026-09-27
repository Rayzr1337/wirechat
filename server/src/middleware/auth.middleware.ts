import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "./error.middleware";

const secret = process.env.JWT_SECRET;

export function isUser(req: Request, res: Response, next: NextFunction) {
  if (!secret) throw new Error("JWT Secret is not defined!");

  const token = req.cookies.token;
  if (!token) return next(new AppError(401, "UNAUTHORIZED", "Not logged in."));

  try {
    const payload = jwt.verify(token, secret) as jwt.JwtPayload & { userId: string };
    req.user = { userId: payload.userId };
    return next();
  } catch {
    return next(new AppError(401, "UNAUTHORIZED", "Invalid or expired token!"));
  }
}