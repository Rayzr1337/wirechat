import { isUser } from '../middleware/auth.middleware';
import { register, login, logout, getWsTicket } from '../controllers/auth.controller';
import { asyncErrorHandler } from '../middleware/error.middleware';
import { Router } from "express";

export const authRouter = Router();

authRouter.post("/register", asyncErrorHandler(register));
authRouter.post("/login", asyncErrorHandler(login));
authRouter.post("/logout", asyncErrorHandler(logout));

authRouter.post("/ws-ticket", isUser, asyncErrorHandler(getWsTicket));
