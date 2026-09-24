import { editMessageSchema, messageEditedSchema } from "../protocol/schemas";
import { z } from 'zod';
import { AuthenticatedSocket } from '../server';
import { broadcastToRoom } from '../broadcast';
import { editMessage } from '../../services/messages.service';

type EditMessage = z.infer<typeof editMessageSchema>;
type MessageEdited = z.infer<typeof messageEditedSchema>;

export async function handleEditMessage(userId: string, ws: AuthenticatedSocket, incomingMessage: EditMessage) {
    const msg = await editMessage(incomingMessage.payload.messageId, userId, incomingMessage.payload.content);
    const editedMsg: MessageEdited = {
        type: "MESSAGE_EDITED",
        payload: {
            id: msg.id,
            roomId: msg.roomId,
            content: msg.content,
            editedAt: msg.editedAt?.toISOString() ?? new Date().toISOString()
        }
    };

    await broadcastToRoom(msg.roomId, editedMsg);
}