import type { Request, Response } from 'express';
import * as messagesService from '../services/messages.service';
import type { GetMessagesQuery } from '../schemas/messageQuery.schema';

export async function getMessages(
  req: Request<{ roomId: string }, {}, {}, GetMessagesQuery>,
  res: Response
) {
  const roomId = req.params.roomId;
  const { limit, cursor } = req.query;
  const messages = await messagesService.getMessages(roomId, { limit, cursor });
  res.json(messages);
}

export async function getMessageById(req: Request<{ messageId: string }>, res: Response) {
  const messageId = req.params.messageId;
  const message = await messagesService.getMessageById(messageId);
  res.json(message);
}