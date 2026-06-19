import { ATTENDANCE_REWARD_POINT } from "@toss/shared";
import type { AttendanceStatusResponse } from "@toss/shared";
import type { ReactNode } from "react";
import { daysToNextReward } from "../lib/reward";

interface AttendanceSummaryProps {
  /** 출석 현황. 로딩 중에는 undefined → 연속일은 "-"로 표시. */
  status?: AttendanceStatusResponse;
  /** 내일 받을 수 있는 일일 미션 포인트 합(전부 달성 가정). */
  missionMaxPoint?: number;
}

const PointHighlight = ({ children }: { children: ReactNode }) => (
  <span className="text-[15px] font-bold text-(--color-toss-blue)">
    {children}
  </span>
);

// 내일 받을 수 있는 최대 포인트 = 출석 마일스톤(내일) + 일일 미션 포인트 합.
// 둘 다 0이면(미션 미배정 + 내일 마일스톤 아님) 다음 보상까지 남은 일수를 안내한다.
const renderSubText = (
  status: AttendanceStatusResponse | undefined,
  missionMaxPoint: number,
): ReactNode => {
  if (!status) return "매일 출석하고 토스포인트를 받아요";
  const maxTomorrow = status.tomorrowMaxPoint + missionMaxPoint;
  if (maxTomorrow > 0) {
    return (
      <>
        내일도 참여하면 최대 <PointHighlight>{maxTomorrow}원</PointHighlight>
      </>
    );
  }
  return (
    <>
      {daysToNextReward(status.cycleDay)}일 더 출석하면{" "}
      <PointHighlight>{ATTENDANCE_REWARD_POINT}원</PointHighlight>
    </>
  );
};

/**
 * 출석 요약 헤더(🔥 연속일 + 다음 보상 안내).
 * 대시보드 StreakStatsCard와 미션 탭 출석 카드가 공유한다.
 */
const AttendanceSummary = ({
  status,
  missionMaxPoint = 0,
}: AttendanceSummaryProps) => {
  const streakText = status ? `${status.cycleDay}` : "-";

  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-(--color-page) text-2xl leading-none"
      >
        🔥
      </span>
      <div>
        <p className="leading-tight font-bold text-(--color-black)">
          <span className="text-[22px] text-(--color-toss-blue)">
            {streakText}일
          </span>{" "}
          <span className="text-base">연속 출석 중!</span>
        </p>
        <p className="mt-1 text-[13px] text-(--color-grey)">
          {renderSubText(status, missionMaxPoint)}
        </p>
      </div>
    </div>
  );
};

export default AttendanceSummary;
