import { CHAT_MAX_LENGTH } from '@shared/types';
import { escapeHtml } from 'src/common/utils/sanitize';
import { z } from 'zod';

export const ServerChatMessageSchema = z.object({
  roomId: z.string(),
  message: z
    .string()
    .min(1)
    .max(CHAT_MAX_LENGTH)
    .transform((val) => escapeHtml(val.trim())),
});

export type ChatMessageDto = z.infer<typeof ServerChatMessageSchema>;
