import { z } from "zod";

export const TossMessengerResultTypeSchema = z.enum([
  "SUCCESS",
  "HTTP_TIMEOUT",
  "NETWORK_ERROR",
  "EXECUTION_FAIL",
  "INTERRUPTED",
  "INTERNAL_ERROR",
  "FAIL",
]);

const SentItemSchema = z.object({
  contentId: z.string(),
});

const FailItemSchema = z.object({
  contentId: z.string(),
  reachFailReason: z.string(),
});

const SentChannelsSchema = z.object({
  sentPush: z.array(SentItemSchema).default([]),
  sentInbox: z.array(SentItemSchema).default([]),
  sentSms: z.array(SentItemSchema).default([]),
  sentAlimtalk: z.array(SentItemSchema).default([]),
  sentFriendtalk: z.array(SentItemSchema).default([]),
});

const FailChannelsSchema = z.object({
  sentPush: z.array(FailItemSchema).default([]),
  sentInbox: z.array(FailItemSchema).default([]),
  sentSms: z.array(FailItemSchema).default([]),
  sentAlimtalk: z.array(FailItemSchema).default([]),
  sentFriendtalk: z.array(FailItemSchema).default([]),
});

const TossMessengerResultSchema = z.object({
  msgCount: z.number(),
  sentPushCount: z.number(),
  sentInboxCount: z.number(),
  sentSmsCount: z.number(),
  sentAlimtalkCount: z.number(),
  sentFriendtalkCount: z.number(),
  detail: SentChannelsSchema,
  fail: FailChannelsSchema,
});

const TossMessengerErrorSchema = z.object({
  errorType: z.number().optional(),
  errorCode: z.string().optional(),
  reason: z.string().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  title: z.string().optional(),
});

export const TossMessengerResponseSchema = z.object({
  resultType: TossMessengerResultTypeSchema,
  result: TossMessengerResultSchema.optional(),
  error: TossMessengerErrorSchema.optional(),
});

export type TossMessengerResponse = z.infer<typeof TossMessengerResponseSchema>;
export type TossMessengerResultType = z.infer<
  typeof TossMessengerResultTypeSchema
>;

export const SendMessageInputSchema = z.object({
  userKey: z.number().int().positive(),
  templateSetCode: z.string().min(1),
  context: z.record(z.string(), z.unknown()).default({}),
});

export type SendMessageInput = z.infer<typeof SendMessageInputSchema>;

export const BulkSendMessageInputSchema = z.object({
  templateSetCode: z.string().min(1),
  contextList: z
    .array(
      z.object({
        userKey: z.number().int().positive(),
        context: z.record(z.string(), z.unknown()).default({}),
      }),
    )
    .min(1)
    .max(2500),
});

export type BulkSendMessageInput = z.infer<typeof BulkSendMessageInputSchema>;
