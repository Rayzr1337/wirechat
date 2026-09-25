import { isUser } from '../middleware/auth.middleware';
import * as usersController from '../controllers/user.controller';
import { asyncErrorHandler } from '../middleware/error.middleware';
import { Router } from "express";

import { validate } from '../middleware/validation.middleware';
import * as userSchema from '../schemas/user.schema';

export const usersRouter = Router();

usersRouter.get("/me", isUser, asyncErrorHandler(usersController.getMe));

usersRouter.patch(
  "/me",
  isUser,
  validate(userSchema.updateProfileBodySchema),
  asyncErrorHandler(usersController.updateProfile)
);

usersRouter.patch(
  "/me/password",
  isUser,
  validate(userSchema.changePasswordBodySchema),
  asyncErrorHandler(usersController.changePassword)
);

usersRouter.post(
  "/me/change-email",
  isUser,
  validate(userSchema.requestEmailChangeBodySchema),
  asyncErrorHandler(usersController.requestEmailChange)
);