import { z } from "zod";

// chance 충전 출처: 광고 시청(ad) 또는 친구 공유(share)
export const ChargeSourceSchema = z.enum(["ad", "share"]);
export type ChargeSource = z.infer<typeof ChargeSourceSchema>;

export const MyChanceResponseSchema = z.object({
  count: z.number().int().min(0),
});
export type MyChanceResponse = z.infer<typeof MyChanceResponseSchema>;

// 인앱 광고 2.0 ver2 (loadFullScreenAd/showFullScreenAd) `userEarnedReward` 이벤트 페이로드
export const AdSdkPayloadSchema = z.object({
  adGroupId: z.string().min(1), // 앱인토스 콘솔의 광고 그룹 ID (전면/리워드 자동 결정)
  unitType: z.string().optional(), // 리워드 단위 (예: coin, point)
  unitAmount: z.number().int().min(0).optional(), // 리워드 수량
});
export type AdSdkPayload = z.infer<typeof AdSdkPayloadSchema>;

// 친구 공유 적립: 토스 SDK contactsViral 정식 경로만 인정
export const ShareSdkPayloadSchema = z.object({
  channel: z.literal("contactsViral"),
  moduleId: z.string().min(1), // 앱인토스 콘솔의 공유 리워드 모듈 ID
  rewardAmount: z.number().int().min(0).optional(),
  rewardUnit: z.string().optional(),
});
export type ShareSdkPayload = z.infer<typeof ShareSdkPayloadSchema>;

export const ChargeRequestSchema = z.discriminatedUnion("source", [
  z.object({
    source: z.literal("ad"),
    sdkPayload: AdSdkPayloadSchema,
  }),
  z.object({
    source: z.literal("share"),
    sdkPayload: ShareSdkPayloadSchema,
  }),
]);
export type ChargeRequest = z.infer<typeof ChargeRequestSchema>;

export const ChargeResponseSchema = MyChanceResponseSchema;
export type ChargeResponse = z.infer<typeof ChargeResponseSchema>;

export const ConsumeResponseSchema = MyChanceResponseSchema;
export type ConsumeResponse = z.infer<typeof ConsumeResponseSchema>;
