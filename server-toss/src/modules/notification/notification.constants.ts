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

// 토스 대량 발송 위임 최소 인원. 이 값 미만이면 단건으로 보낸다.
// 스케줄러(위임 판단)와 서비스(실제 발송)가 같은 기준을 쓰도록 단일 소스로 둔다.
export const BULK_MESSAGE_MIN_RECIPIENTS = 50;
