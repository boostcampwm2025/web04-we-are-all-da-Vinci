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
  agreedAt: z.iso.datetime().nullable().optional(),
  rejectedAt: z.iso.datetime().nullable().optional(),
  lastEventAt: z.iso.datetime().nullable().optional(),
});

export type NotificationAgreementResponse = z.infer<
  typeof NotificationAgreementResponseSchema
>;
