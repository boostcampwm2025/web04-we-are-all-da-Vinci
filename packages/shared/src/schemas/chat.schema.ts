import { z } from 'zod';

export const SystemMessageTypeSchema = z.enum([
  'join',
  'leave',
  'kick',
  'game_start',
  'round_start',
  'host_change',
  'timer_warning',
]);

export const ChatMessageSchema = z.object({
  type: z.enum(['user', 'system']),
  socketId: z.string().optional(),
  nickname: z.string().optional(),
  profileId: z.string().optional(),
  message: z.string().max(100),
  timestamp: z.number(),
  systemType: SystemMessageTypeSchema.optional(),
});

export const ChatMessagePayloadSchema = z.object({
  roomId: z.string(),
  message: z.string().min(1).max(100),
});

export const ChatHistoryPayloadSchema = z.object({
  roomId: z.string(),
  messages: z.array(ChatMessageSchema),
});

export const ChatErrorSchema = z.object({
  message: z.string(),
});
