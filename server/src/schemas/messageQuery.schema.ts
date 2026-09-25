import { z } from "zod";

export const getMessagesQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
  cursor: z.string().uuid("Invalid cursor format").optional(),
});

export type GetMessagesQuery = z.infer<typeof getMessagesQuerySchema>;