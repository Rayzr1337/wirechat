import { incomingMessageSchema, type IncomingMessage } from './schemas';

export type ValidationResult = 
{ success: true, data: IncomingMessage } 
| { success: false; code: "INVALID_MESSAGE", message: string; };

export function validateIncomingMessage(raw: string) : ValidationResult {
    let parsed: unknown;

    try {
        parsed = JSON.parse(raw);
    } catch (e) {
        return { success: false, code: "INVALID_MESSAGE", message: "Invalid JSON format" };
    }

    const result = incomingMessageSchema.safeParse(parsed);

    if (!result.success) {
        return { success: false, code: "INVALID_MESSAGE", message: result.error.message };
    } 

    return { success: true, data: result.data }
};