import type { PodiumResponse } from "@/entities/podium";
import { RankBadge } from "@/shared/ui/rankBadge";
import { Skeleton } from "@toss/tds-mobile";
import { memo } from "react";
import { useNavigate } from "react-router-dom";

interface DavinciRowProps {
  rank: number;
  nickname: string;
  score: number;
  isMe?: boolean;
}

const DavinciRow = ({
  rank,
  nickname,
  score,
  isMe = false,
}: DavinciRowProps) => (
  <div
    className={`flex items-center gap-3 py-2.5${
      isMe ? " -mx-2 rounded-(--radius-inner) bg-(--color-card-blue) px-2" : ""
    }`}
  >
    <RankBadge rank={rank} className="h-7 w-7 shrink-0 text-[13px]" />
    <span className="flex-1 truncate text-[15px] font-medium text-(--color-black)">
      {nickname}
    </span>
    {isMe && (
      <span className="shrink-0 rounded-full bg-(--color-blue) px-1.5 py-0.5 text-[11px] font-bold text-white">
        나
      </span>
    )}
    <span className="shrink-0 text-[15px] text-(--color-grey)">
      {score.toFixed(2)}점
    </span>
  </div>
);

interface TodayDavinciCardProps {
  podium?: PodiumResponse["podium"];
  /** 내 랭킹(top3 안일 때만 1~3). 해당 순위 행을 "나"로 강조한다. */
  myRank?: number;
}

const TodayDavinciCard = ({ podium, myRank }: TodayDavinciCardProps) => {
  const navigate = useNavigate();
  const isLoading = podium === undefined;
  const top3 = podium?.slice(0, 3) ?? [];

  return (
    <section className="rounded-(--radius-card) border border-(--color-card) bg-(--color-page) p-4">
      <button
        type="button"
        onClick={() => navigate("/ranking")}
        className="flex w-full items-baseline justify-between"
      >
        <h2 className="text-base font-bold text-(--color-black)">
          기억력 TOP3
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
              isMe={myRank === idx + 1}
            />
          ))
        ) : (
          <p className="py-6 text-center text-sm text-(--color-grey)">
            아직 오늘의 기록이 없어요
          </p>
        )}
      </div>
    </section>
  );
};

export default memo(TodayDavinciCard);
