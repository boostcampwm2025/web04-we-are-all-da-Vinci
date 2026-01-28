import { CHAT_MAX_LENGTH } from 'src/common/constants';
import { z } from 'zod';

export const ChatMessageSchema = z.object({
  roomId: z.string().min(1, '방 ID가 필요합니다.'),
  message: z
    .string()
    .min(1, '메시지를 입력해주세요.')
    .max(CHAT_MAX_LENGTH, `메시지는 ${CHAT_MAX_LENGTH}자 이내로 입력해주세요.`)
    .transform((val) => val.trim())
    .refine((val) => val.length > 0, '메시지를 입력해주세요.'),
});

export type ChatMessageDto = z.infer<typeof ChatMessageSchema>;
