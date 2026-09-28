import { isUser } from '../middleware/auth.middleware';
import * as messagesController from '../controllers/messages.controller';
import { asyncErrorHandler } from '../middleware/error.middleware';
import { validateQuery } from '../middleware/validation.middleware';
import { getMessagesQuerySchema } from '../schemas/messageQuery.schema';
import { Router } from "express";


export const messagesRouter = Router();

messagesRouter.get(
  "/:roomId",
  isUser,
  validateQuery(getMessagesQuerySchema),
  asyncErrorHandler(messagesController.getMessages)
);

messagesRouter.get(
  "/message/:messageId",
  isUser,
  asyncErrorHandler(messagesController.getMessageById)
);
