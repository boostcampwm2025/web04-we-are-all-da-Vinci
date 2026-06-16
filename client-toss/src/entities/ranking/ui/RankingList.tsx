import { ReplayDrawingCanvas } from "@/entities/drawingCanvas";
import { DrawingScoreDetailSheet } from "@/entities/myScoreCard";
import { AD_GROUP_IDS } from "@/shared/config";
import { FUNNEL_EVENTS, trackClick } from "@/shared/lib";
import { BannerAd } from "@/shared/ui/bannerAd";
import { Skeleton } from "@toss/tds-mobile";
import { useEffect, useRef, useState } from "react";
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

const chunkRankingList = (rankingList: RankingListItem[]) => {
  const chunks: RankingListItem[][] = [];

  for (let i = 0; i < rankingList.length; i += 6) {
    chunks.push(rankingList.slice(i, i + 6));
  }

  return chunks;
};

const RankingList = () => {
  const { rankingList, isLoading } = useRankingList();
  const [selectedRanking, setSelectedRanking] =
    useState<RankingListItem | null>(null);

  const chunkRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [chunkReplayKeys, setChunkReplayKeys] = useState<
    Record<number, number>
  >({});
  const [visibleChunks, setVisibleChunks] = useState<Record<number, boolean>>(
    {},
  );

  const increaseChunkReplayKeys = (chunkIndex: number) => {
    setChunkReplayKeys((prev) => ({
      ...prev,
      [chunkIndex]: (prev[chunkIndex] || 0) + 1,
    }));
  };

  useEffect(() => {
    if (!rankingList) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const chunkIndex = Number(
            (entry.target as HTMLElement).dataset.chunkIndex,
          );
          if (entry.isIntersecting) {
            increaseChunkReplayKeys(chunkIndex);
            setVisibleChunks((prev) => ({ ...prev, [chunkIndex]: true }));
          } else {
            setVisibleChunks((prev) => ({ ...prev, [chunkIndex]: false }));
          }
        });
      },
      {
        threshold: 0.5,
      },
    );

    Object.values(chunkRefs.current).forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [rankingList]);

  if (isLoading) {
    return <Skeleton pattern="listOnly" style={{ width: "100%" }} />;
  }

  if (!rankingList || rankingList.length === 0) {
    return <RankingListEmpty />;
  }

  return (
    <div className="px-(--page-px)">
      <div className="flex flex-col">
        {chunkRankingList(rankingList).map((chunk, chunkIndex) => (
          <div
            key={`ranking-chunk-${chunkIndex}`}
            data-chunk-index={chunkIndex}
            className="flex flex-col"
            ref={(el) => {
              chunkRefs.current[chunkIndex] = el;
            }}
          >
            <div className="grid grid-cols-3 gap-x-4 gap-y-5">
              {chunk.map((ranking) => (
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
                      backgroundColor: getRankBadgeColor(
                        ranking.rank,
                        ranking.isMe,
                      ),
                      color: ranking.isMe ? "#FFFFFF" : "#031228B2",
                    }}
                  >
                    {ranking.rank}
                  </span>
                  <ReplayDrawingCanvas
                    strokes={ranking.strokes}
                    loop={false}
                    isVisible={visibleChunks[chunkIndex] ?? true}
                    replayKey={chunkReplayKeys[chunkIndex] || 0}
                    targetDurationMs={2000}
                    shouldScale
                    ariaLabel={`${ranking.rank}위 ${ranking.nickname} 그림`}
                  />
                </button>
              ))}
            </div>
            {chunkIndex < Math.ceil(rankingList.length / 6) - 1 && (
              <BannerAd
                adGroupId={AD_GROUP_IDS.BANNER_LIST}
                className="w-full"
              />
            )}
          </div>
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
