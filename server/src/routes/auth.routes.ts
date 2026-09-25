import { isUser } from '../middleware/auth.middleware';
import * as authController from '../controllers/auth.controller';
import { asyncErrorHandler } from '../middleware/error.middleware';
import { Router } from "express";

import { validate } from '../middleware/validation.middleware';
import { registerBodySchema, loginBodySchema } from '../schemas/user.schema';

export const authRouter = Router();

authRouter.post("/register", validate(registerBodySchema), asyncErrorHandler(authController.register));
authRouter.post("/login", validate(loginBodySchema), asyncErrorHandler(authController.login));
authRouter.post("/logout", asyncErrorHandler(authController.logout));

authRouter.post("/ws-ticket", isUser, asyncErrorHandler(authController.getWsTicket));
authRouter.get("/verify-email", asyncErrorHandler(authController.verifyEmailWithToken)); 
authRouter.post("/resend-verification", isUser, asyncErrorHandler(authController.resendVerification));