import { usePodium } from "@/entities/podium";
import { Skeleton } from "@toss/tds-mobile";
import { useNavigate } from "react-router-dom";

const RANK_COLOR_CLASS: Record<number, string> = {
  1: "bg-(--color-gold)",
  2: "bg-(--color-silver)",
  3: "bg-(--color-bronze)",
};

interface DavinciRowProps {
  rank: number;
  nickname: string;
  score: number;
}

const DavinciRow = ({ rank, nickname, score }: DavinciRowProps) => (
  <div className="flex items-center gap-3 py-2.5">
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white ${RANK_COLOR_CLASS[rank]}`}
    >
      {rank}
    </span>
    <span className="flex-1 truncate text-[15px] font-medium text-(--color-black)">
      {nickname}
    </span>
    <span className="shrink-0 text-[15px] text-(--color-grey)">
      {score.toFixed(2)}점
    </span>
  </div>
);

const TodayDavinciCard = () => {
  const navigate = useNavigate();
  const { podium, isLoading } = usePodium();
  const top3 = podium?.slice(0, 3) ?? [];

  return (
    <section className="rounded-(--radius-card) border border-(--color-card) bg-(--color-page) p-4">
      <button
        type="button"
        onClick={() => navigate("/ranking")}
        className="flex w-full items-baseline justify-between"
      >
        <h2 className="text-base font-bold text-(--color-black)">
          오늘의 다빈치
        </h2>
        <span className="text-[13px] font-medium text-(--color-grey)">
          랭킹 top100 ›
        </span>
      </button>

      <div className="mt-1">
        {isLoading ? (
          <Skeleton pattern="listOnly" style={{ width: "100%" }} />
        ) : top3.length > 0 ? (
          top3.map((entry, idx) => (
            <DavinciRow
              key={`${entry.nickname}-${idx}`}
              rank={idx + 1}
              nickname={entry.nickname}
              score={entry.score}
            />
          ))
        ) : (
          <p className="py-6 text-center text-sm text-(--color-grey)">
            아직 오늘의 다빈치가 없어요
          </p>
        )}
      </div>
    </section>
  );
};

export default TodayDavinciCard;
