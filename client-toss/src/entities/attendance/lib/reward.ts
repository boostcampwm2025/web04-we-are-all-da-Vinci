import { ATTENDANCE_CYCLE_LENGTH, ATTENDANCE_REWARD_DAYS } from "@toss/shared";

/**
 * 현재 사이클 위치(cycleDay)에서 다음 보상 마일스톤까지 남은 일수(1 이상).
 * 오늘이 보상일이면 이번이 아니라 다음 사이클의 해당 일까지를 센다.
 */
export const daysToNextReward = (cycleDay: number): number => {
  const distances = ATTENDANCE_REWARD_DAYS.map((rewardDay) => {
    const diff =
      (rewardDay - cycleDay + ATTENDANCE_CYCLE_LENGTH) %
      ATTENDANCE_CYCLE_LENGTH;
    return diff === 0 ? ATTENDANCE_CYCLE_LENGTH : diff;
  });
  return Math.min(...distances);
};
