import { deleteMessageSchema, messageDeletedSchema } from "../protocol/schemas";
import { z } from 'zod';
import { AuthenticatedSocket } from '../server';
import { broadcastToRoom } from '../broadcast';
import { deleteMessage } from '../../services/messages.service';

type DeleteMessage = z.infer<typeof deleteMessageSchema>;
type MessageDeleted = z.infer<typeof messageDeletedSchema>;

export async function handleDeleteMessage(userId: string, ws: AuthenticatedSocket, incomingMessage: DeleteMessage) {
    const msg = await deleteMessage(incomingMessage.payload.messageId, userId);
    const deletedMsg: MessageDeleted = {
        type: "MESSAGE_DELETED",
        payload: {
            id: msg.id,
            roomId: msg.roomId
        }
    };

    await broadcastToRoom(msg.roomId, deletedMsg);
}
