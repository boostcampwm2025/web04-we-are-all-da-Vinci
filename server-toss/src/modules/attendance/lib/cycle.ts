import {
  ATTENDANCE_CYCLE_LENGTH,
  ATTENDANCE_REWARD_DAYS,
  ATTENDANCE_REWARD_POINT,
} from "@toss/shared";

// 출석 사이클 순수 함수 — 서비스/테스트가 공유한다(부수효과 없음).

/** 연속 출석 시 다음 사이클 위치. 사이클 끝(7)에 도달하면 1로 초기화된다. */
export const nextCycleDay = (day: number): number =>
  day >= ATTENDANCE_CYCLE_LENGTH ? 1 : day + 1;

/** 해당 사이클 위치에서 지급되는 포인트(마일스톤이 아니면 0). */
export const rewardFor = (day: number): number =>
  (ATTENDANCE_REWARD_DAYS as readonly number[]).includes(day)
    ? ATTENDANCE_REWARD_POINT
    : 0;

/** 해당 사이클 위치가 보상 마일스톤이면 그 일차(3|7)를, 아니면 null을 반환한다. */
export const rewardedDayFor = (
  day: number,
): (typeof ATTENDANCE_REWARD_DAYS)[number] | null =>
  ATTENDANCE_REWARD_DAYS.find((rewardDay) => rewardDay === day) ?? null;

/** 오늘(cycleDay)에 이어 내일도 출석할 경우 받을 수 있는 최대 포인트. */
export const tomorrowMaxPoint = (day: number): number =>
  rewardFor(nextCycleDay(day));
