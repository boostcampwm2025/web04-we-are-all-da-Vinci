/** 끊김 복구 토스트 노출 시간(ms). */
export const ATTENDANCE_RECOVERY_TOAST_DURATION_MS = 2500;

/** 복구 성공 안내. */
export const ATTENDANCE_RECOVERY_SUCCESS_MESSAGE = "연속출석을 이어갔어요";

/** "새롭게 시작하기"(복구 포기) 실패 안내. */
export const ATTENDANCE_RECOVERY_DECLINE_FAIL_MESSAGE =
  "잠시 후 다시 시도해주세요.";

/** 복구(광고) 실패 사유별 안내 문구. */
const RECOVERY_FAIL_MESSAGE = {
  ad_not_ready: "광고를 불러오고 있어요. 잠시 후 다시 시도해주세요.",
  not_watched: "광고 시청이 완료되지 않았어요. 다시 시도해주세요.",
  error: "이어가기에 실패했어요. 잠시 후 다시 시도해주세요.",
} as const;

/** 복구 실패 사유 — 메시지 맵의 키이자 `useAttendanceRecovery` 반환 reason의 단일 소스. */
export type RecoveryFailReason = keyof typeof RECOVERY_FAIL_MESSAGE;

export const getRecoveryFailMessage = (reason: RecoveryFailReason): string =>
  RECOVERY_FAIL_MESSAGE[reason];
