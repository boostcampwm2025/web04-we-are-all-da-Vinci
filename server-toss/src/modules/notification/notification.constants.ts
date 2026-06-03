export const NOTIFICATION_TYPE = {
  DAILY_PROMPT: "daily_prompt",
  OVERTAKEN: "overtaken",
} as const;

export type NotificationType =
  (typeof NOTIFICATION_TYPE)[keyof typeof NOTIFICATION_TYPE];

export const NOTIFICATION_AGREEMENT_STATUS = {
  AGREED: "AGREED",
  REJECTED: "REJECTED",
} as const;

export type NotificationAgreementStatus =
  (typeof NOTIFICATION_AGREEMENT_STATUS)[keyof typeof NOTIFICATION_AGREEMENT_STATUS];

// 발송 라이프사이클. INSERT 시 IN_FLIGHT → 토스 응답으로 DELIVERED/FAILED.
// 토스 멱등성 키 미지원이라 row 자체는 지우지 않고 status로 결과 추적.
// UNIQUE(user_key, type, reference_id)가 다음 cron의 재발송을 자동 차단.
export const SENT_NOTIFICATION_STATUS = {
  IN_FLIGHT: "IN_FLIGHT",
  DELIVERED: "DELIVERED",
  FAILED: "FAILED",
} as const;

export type SentNotificationStatus =
  (typeof SENT_NOTIFICATION_STATUS)[keyof typeof SENT_NOTIFICATION_STATUS];
