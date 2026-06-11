import { useMyRanking } from "@/entities/ranking";
import { TextButton } from "@toss/tds-mobile";
import { useNavigate } from "react-router-dom";
import {
  STREAK_BONUS_POINT,
  STREAK_DAYS,
  TODAY_POINTS,
} from "../config/dashboardMock";

interface StatItemProps {
  label: string;
  value: string;
}

const StatItem = ({ label, value }: StatItemProps) => (
  <div className="flex flex-1 flex-col items-start gap-1.5 px-3">
    <span className="text-[13px] whitespace-nowrap text-(--color-grey)">
      {label}
    </span>
    <span className="text-[17px] leading-none font-bold text-(--color-black)">
      {value}
    </span>
  </div>
);

const StreakStatsCard = () => {
  const navigate = useNavigate();
  const { myRanking } = useMyRanking();

  // 로딩 중에는 myRanking이 undefined → found=false → 두 값 모두 "-"로 표시
  const found = myRanking?.state === "FOUND";
  const scoreText = found ? `${myRanking.ranking.score}` : "-";
  const rankText = found ? `${myRanking.ranking.rank}위` : "-";

  return (
    <section className="rounded-(--radius-card) bg-(--color-card-blue) p-5">
      <div className="flex items-center justify-between">
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
                {STREAK_DAYS}일
              </span>{" "}
              <span className="text-base">연속 참여 중!</span>
            </p>
            <p className="mt-1 text-[13px] text-(--color-grey)">
              내일도 참여하면 +{STREAK_BONUS_POINT}P
            </p>
          </div>
        </div>
        <TextButton
          size="small"
          variant="arrow"
          color="var(--color-grey)"
          onClick={() => navigate("/archive")}
        >
          내 기록 보기
        </TextButton>
      </div>

      <div className="mt-5 flex items-stretch rounded-(--radius-inner) bg-(--color-page) py-4">
        <StatItem label="당일 획득 포인트" value={`${TODAY_POINTS}P`} />
        <div className="my-1 w-px self-stretch bg-(--color-card)" />
        <StatItem label="기억력 점수" value={scoreText} />
        <div className="my-1 w-px self-stretch bg-(--color-card)" />
        <StatItem label="오늘 순위" value={rankText} />
      </div>
    </section>
  );
};

export default StreakStatsCard;
