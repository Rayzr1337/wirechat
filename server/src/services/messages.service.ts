import { messageRepository } from "../repositories/message.repository";
import { roomRepository } from "../repositories/room.repository";
import { AppError } from "../middleware/error.middleware";

export async function sendMessage(senderId: string, roomId: string, content: string) {
    const room = await roomRepository.getRoomById(roomId);
    if (!room) {
        throw new AppError(404, "ROOM_NOT_FOUND", "Room not found!");
    }

    const isMember = await roomRepository.isMemberOfRoom(roomId, senderId);
    if (!isMember) {
        throw new AppError(403, "NOT_IN_ROOM", "You must be a member of the room to send a message.");
    }

    const message = await messageRepository.createMessage({
        room : { connect: { id: roomId } },
        sender: { connect: { id: senderId } },
        content
    });
    
    return message;
}

export async function editMessage(messageId: string, editorId: string, newContent: string) {
    const message = await messageRepository.getMessageById(messageId);
    if (!message) {
        throw new AppError(404, "MESSAGE_NOT_FOUND", "Message not found!");
    }
    
    if (message.senderId !== editorId) {
        throw new AppError(403, "UNAUTHORIZED", "You can only edit your own messages.");
    }
    
    const updated = await messageRepository.updateMessage(messageId, { 
        content: newContent,
        editedAt: new Date()
    });
    return updated;
}

export async function deleteMessage(messageId: string, deleterId: string) {
    const message = await messageRepository.getMessageById(messageId);
    if (!message) {
        throw new AppError(404, "MESSAGE_NOT_FOUND", "Message not found!");
    }
    
    if (message.senderId !== deleterId) {
        throw new AppError(403, "UNAUTHORIZED", "You can only delete your own messages.");
    }
    
    return messageRepository.deleteMessage(messageId);
}

export async function getMessageById(messageId: string) {
    const message = await messageRepository.getMessageById(messageId);
    if (!message) {
        throw new AppError(404, "MESSAGE_NOT_FOUND", "Message not found!");
    }
    
    return message;
}

export async function getMessages(roomId: string, options: { limit?: number; cursor?: string } = {}) {
    const room = await roomRepository.getRoomById(roomId);
    if (!room) {
        throw new AppError(404, "ROOM_NOT_FOUND", "Room not found!");
    }

    return messageRepository.getMessagesByRoomId(roomId, options);
}

