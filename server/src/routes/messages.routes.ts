import { isUser } from '../middleware/auth.middleware';
import * as messagesController from '../controllers/messages.controller';
import { asyncErrorHandler } from '../middleware/error.middleware';
import { Router } from "express";


export const messagesRouter = Router();

messagesRouter.get(
  "/message/:messageId",
  isUser,
  asyncErrorHandler(messagesController.getMessageById)
);
