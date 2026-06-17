import { z } from "zod";
import { AdSdkPayloadSchema } from "./chance.schema";

/** 출석 사이클 길이(일). 7일 달성 후 1일차로 초기화된다. */
export const ATTENDANCE_CYCLE_LENGTH = 7;
/** 보상이 지급되는 사이클 위치(일차). */
export const ATTENDANCE_REWARD_DAYS = [3, 7] as const;
/** 마일스톤 도달 시 지급되는 토스 포인트(고정). */
export const ATTENDANCE_REWARD_POINT = 5;

// 체크인 결과 상태
// - started: 첫 출석(1일차)
// - continued: 어제에 이어 연속 출석
// - already: 오늘 이미 출석함(멱등 재호출)
// - reset_recoverable: 연속이 끊겨 1일차로 리셋됐고 광고로 복구 가능
export const AttendanceCheckInStatusSchema = z.enum([
  "started",
  "continued",
  "already",
  "reset_recoverable",
]);
export type AttendanceCheckInStatus = z.infer<
  typeof AttendanceCheckInStatusSchema
>;

export const AttendanceStatusResponseSchema = z.object({
  cycleDay: z.number().int().min(0).max(ATTENDANCE_CYCLE_LENGTH), // 0 = 출석 이력 없음
  checkedToday: z.boolean(),
  recoverable: z.boolean(),
  previousDay: z.number().int().min(0).max(ATTENDANCE_CYCLE_LENGTH).nullable(),
  tomorrowMaxPoint: z.number().int().min(0),
  totalPoints: z.number().int().min(0),
  todayPoints: z.number().int().min(0),
});
export type AttendanceStatusResponse = z.infer<
  typeof AttendanceStatusResponseSchema
>;

export const AttendanceCheckInResponseSchema = z.object({
  status: AttendanceCheckInStatusSchema,
  cycleDay: z.number().int().min(1).max(ATTENDANCE_CYCLE_LENGTH),
  recoverable: z.boolean(),
  previousDay: z.number().int().min(0).max(ATTENDANCE_CYCLE_LENGTH).nullable(),
  rewardedDay: z.number().int().nullable(), // 지급 트리거된 마일스톤(3|7) 또는 null
});
export type AttendanceCheckInResponse = z.infer<
  typeof AttendanceCheckInResponseSchema
>;

export const AttendanceRecoverRequestSchema = z.object({
  sdkPayload: AdSdkPayloadSchema,
});
export type AttendanceRecoverRequest = z.infer<
  typeof AttendanceRecoverRequestSchema
>;

export const AttendanceRecoverResponseSchema = z.object({
  cycleDay: z.number().int().min(1).max(ATTENDANCE_CYCLE_LENGTH),
  rewardedDay: z.number().int().nullable(),
});
export type AttendanceRecoverResponse = z.infer<
  typeof AttendanceRecoverResponseSchema
>;
