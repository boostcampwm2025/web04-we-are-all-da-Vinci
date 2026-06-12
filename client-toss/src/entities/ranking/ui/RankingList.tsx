import { StaticDrawingCanvas } from "@/entities/drawingCanvas";
import { DrawingScoreDetailSheet } from "@/entities/myScoreCard";
import { FUNNEL_EVENTS, trackClick } from "@/shared/lib";
import { Skeleton } from "@toss/tds-mobile";
import { useState } from "react";
import {
  DEFAULT_RANK_COLOR,
  MY_RANK_HIGHLIGHT,
  PODIUM_RANK_COLORS,
} from "../config/rankingStyles";
import { useRankingList } from "../hooks/useRankingList";
import type { RankingListItem } from "../model/types";
import RankingListEmpty from "./RankingListEmpty";

const getRankBadgeColor = (rank: number, isMe: boolean) => {
  if (isMe) return MY_RANK_HIGHLIGHT;
  if (rank <= 3) return PODIUM_RANK_COLORS[rank - 1];
  return DEFAULT_RANK_COLOR;
};

const RankingList = () => {
  const { rankingList, isLoading } = useRankingList();
  const [selectedRanking, setSelectedRanking] =
    useState<RankingListItem | null>(null);

  if (isLoading) {
    return <Skeleton pattern="listOnly" style={{ width: "100%" }} />;
  }

  if (!rankingList || rankingList.length === 0) {
    return <RankingListEmpty />;
  }

  return (
    <div className="px-(--page-px)">
      <div className="grid grid-cols-3 gap-x-4 gap-y-5">
        {rankingList.map((ranking) => (
          <button
            key={`${ranking.userKey}-${ranking.drawingId}`}
            type="button"
            aria-label={`${ranking.rank}위 ${ranking.nickname} 그림 상세 보기`}
            className="card relative aspect-square w-full appearance-none border-0 p-1.5 transition-transform duration-100 active:scale-[0.98]"
            onClick={() => {
              trackClick(FUNNEL_EVENTS.rankingItemClick, {
                rank: ranking.rank,
              });
              setSelectedRanking(ranking);
            }}
          >
            <span
              className="absolute top-1 left-1 z-10 flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[13px] font-bold"
              style={{
                backgroundColor: getRankBadgeColor(ranking.rank, ranking.isMe),
                color: ranking.isMe ? "#FFFFFF" : "#031228B2",
              }}
            >
              {ranking.rank}
            </span>
            <StaticDrawingCanvas
              strokes={ranking.strokes}
              isPrompt
              ariaLabel={`${ranking.rank}위 ${ranking.nickname} 그림`}
            />
          </button>
        ))}
      </div>
      {selectedRanking && (
        <DrawingScoreDetailSheet
          open
          onClose={() => setSelectedRanking(null)}
          strokes={selectedRanking.strokes}
          similarity={selectedRanking.similarity}
          title={`${selectedRanking.rank}위 ${selectedRanking.nickname}${selectedRanking.isMe ? " (나)" : ""}`}
        />
      )}
    </div>
  );
};

export default RankingList;
