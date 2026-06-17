import { z } from "zod";

// 포인트 요약 — 누적/오늘 받은 포인트 합. 출석과 독립된 별도 리소스(GET /points/me).
export const PointSummaryResponseSchema = z.object({
  totalPoints: z.number().int().min(0),
  todayPoints: z.number().int().min(0),
});
export type PointSummaryResponse = z.infer<typeof PointSummaryResponseSchema>;
