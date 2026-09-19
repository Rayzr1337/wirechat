import { isUser } from '../middleware/auth.middleware';
import { register, login, logout, getWsTicket } from '../controllers/auth.controller';
import { asyncErrorHandler } from '../middleware/error.middleware';
import { Router } from "express";

import { validate } from '../middleware/validation.middleware';
import { registerBodySchema, loginBodySchema } from '../schemas/user.schema';

export const authRouter = Router();

authRouter.post("/register", validate(registerBodySchema), asyncErrorHandler(register));
authRouter.post("/login", validate(loginBodySchema), asyncErrorHandler(login));
authRouter.post("/logout", asyncErrorHandler(logout));

authRouter.post("/ws-ticket", isUser, asyncErrorHandler(getWsTicket));
