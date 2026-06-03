import { z } from "zod";

export const NotificationAgreementEventSchema = z.enum([
  "newAgreement",
  "alreadyAgreed",
  "agreementRejected",
]);

export type NotificationAgreementEvent = z.infer<
  typeof NotificationAgreementEventSchema
>;

export const NotificationAgreementStatusSchema = z.enum([
  "unknown",
  "agreed",
  "rejected",
]);

export type NotificationAgreementStatus = z.infer<
  typeof NotificationAgreementStatusSchema
>;

export const NotificationAgreementRequestSchema = z.object({
  eventType: NotificationAgreementEventSchema,
});

export type NotificationAgreementRequest = z.infer<
  typeof NotificationAgreementRequestSchema
>;

export const NotificationAgreementResponseSchema = z.object({
  status: NotificationAgreementStatusSchema,
  templateCode: z.string().optional(),
  agreedAt: z.string().nullable().optional(),
  rejectedAt: z.string().nullable().optional(),
  lastEventAt: z.string().nullable().optional(),
});

export type NotificationAgreementResponse = z.infer<
  typeof NotificationAgreementResponseSchema
>;

