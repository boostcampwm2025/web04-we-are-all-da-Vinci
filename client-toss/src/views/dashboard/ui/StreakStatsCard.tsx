import { AttendanceSummary } from "@/entities/attendance";
import { useMyRanking } from "@/entities/ranking";
import type {
  AttendanceStatusResponse,
  PointSummaryResponse,
} from "@toss/shared";
import { memo } from "react";
import { useNavigate } from "react-router-dom";

interface StatItemProps {
  label: string;
  value: string;
}

const StatItem = ({ label, value }: StatItemProps) => (
  <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5 px-1">
    <span className="text-[11px] whitespace-nowrap text-(--color-grey)">
      {label}
    </span>
    <span className="text-[17px] leading-none font-bold text-(--color-black)">
      {value}
    </span>
  </div>
);

interface StreakStatsCardProps {
  status?: AttendanceStatusResponse;
  /** 포인트는 출석과 분리된 리소스(/points/me) — 별도 prop으로 받는다. */
  pointSummary?: PointSummaryResponse;
  missionMaxPoint?: number;
}

const StreakStatsCard = ({
  status,
  pointSummary,
  missionMaxPoint = 0,
}: StreakStatsCardProps) => {
  const navigate = useNavigate();
  const { myRanking } = useMyRanking();

  const found = myRanking?.state === "FOUND";
  const scoreText = found ? `${myRanking.ranking.score}점` : "-";
  const rankText = found ? `${myRanking.ranking.rank}위` : "-";

  const totalText = pointSummary ? `${pointSummary.totalPoints}원` : "-";
  const todayText = pointSummary ? `${pointSummary.todayPoints}원` : "-";

  return (
    <section className="rounded-(--radius-card) bg-(--color-card-blue) p-5">
      <div className="flex items-center justify-between">
        <AttendanceSummary status={status} missionMaxPoint={missionMaxPoint} />
        <button
          type="button"
          onClick={() => navigate("/archive")}
          className="flex shrink-0 items-center"
        >
          <span className="text-[13px] font-medium text-(--color-grey)">
            내 기록 보기 ›
          </span>
        </button>
      </div>

      <div className="mt-5 flex items-stretch rounded-(--radius-inner) bg-(--color-page) py-4">
        <StatItem label="누적 토스포인트" value={totalText} />
        <div className="my-1 w-px self-stretch bg-(--color-card)" />
        <StatItem label="오늘 토스포인트" value={todayText} />
        <div className="my-1 w-px self-stretch bg-(--color-card)" />
        <StatItem label="오늘 점수" value={scoreText} />
        <div className="my-1 w-px self-stretch bg-(--color-card)" />
        <StatItem label="현재 순위" value={rankText} />
      </div>
    </section>
  );
};

export default memo(StreakStatsCard);
