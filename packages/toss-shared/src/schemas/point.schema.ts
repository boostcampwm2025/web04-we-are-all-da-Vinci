import { z } from "zod";

/**
 * 포인트 지급액 단일 소스(SSOT). 출석 마일스톤·미션·기본 지급액이 모두 이 값을 참조한다.
 * 이 값 하나만 바꾸면 지급액·화면 표시가 전부 따라 바뀐다.
 */
export const REWARD_POINT = 5;

// 포인트 요약 — 누적/오늘 받은 포인트 합. 출석과 독립된 별도 리소스(GET /points/me).
export const PointSummaryResponseSchema = z.object({
  totalPoints: z.number().int().min(0),
  todayPoints: z.number().int().min(0),
});
export type PointSummaryResponse = z.infer<typeof PointSummaryResponseSchema>;
