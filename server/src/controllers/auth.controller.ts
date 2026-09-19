import { Request, Response } from "express";
import * as authService from "../services/auth.service";
import type { RegisterBody, LoginBody } from "../schemas/user.schema";

function setAuthCookie(res: Response, token: string) {
  res.cookie("token", token, {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
}

export async function register(req: Request<{}, {}, RegisterBody>, res: Response) {
  const user = await authService.createUser(req.body);
  const token = authService.issueToken(user.id);
  setAuthCookie(res, token);
  res.status(201).json({ id: user.id, username: user.username, email: user.email });
}

export async function login(req: Request<{}, {}, LoginBody>, res: Response) {
  const user = await authService.loginUser(req.body);
  const token = authService.issueToken(user.id);
  setAuthCookie(res, token);
  res.json({ id: user.id, username: user.username, email: user.email });
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  res.json({ message: "Logged out successfully." });
}

export async function getWsTicket(req: Request, res: Response) {
  const ticket = await authService.issueWsTicket(req.user!.userId);
  res.json({ ticket });
}