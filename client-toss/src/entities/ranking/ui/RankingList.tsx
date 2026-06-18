import { ReplayDrawingCanvas } from "@/entities/drawingCanvas";
import { DrawingScoreDetailSheet } from "@/entities/myScoreCard";
import { AD_GROUP_IDS } from "@/shared/config";
import { FUNNEL_EVENTS, trackClick } from "@/shared/lib";
import { BannerAd } from "@/shared/ui/bannerAd";
import { RankBadge } from "@/shared/ui/rankBadge";
import { Skeleton } from "@toss/tds-mobile";
import { useEffect, useRef, useState } from "react";
import { TARGET_MIN_TILES } from "../config/constants";
import { useRankingList } from "../hooks/useRankingList";
import type { RankingListItem } from "../model/types";
import RankingGhostTile from "./RankingGhostTile";
import RankingListEmpty from "./RankingListEmpty";

// 그리드 한 칸: 실제 랭킹 항목이거나, 휑함을 메우는 정적 유령 슬롯이다.
type RankingSlot =
  | { type: "real"; item: RankingListItem }
  | { type: "ghost"; id: number };

// 실제 항목이 TARGET_MIN_TILES보다 적으면 유령 슬롯으로 패딩해 그리드를 채운다.
const buildSlots = (rankingList: RankingListItem[]): RankingSlot[] => {
  const realSlots: RankingSlot[] = rankingList.map((item) => ({
    type: "real",
    item,
  }));
  const ghostCount = Math.max(0, TARGET_MIN_TILES - rankingList.length);
  const ghostSlots: RankingSlot[] = Array.from(
    { length: ghostCount },
    (_, id) => ({ type: "ghost", id }),
  );

  return [...realSlots, ...ghostSlots];
};

const chunkSlots = (slots: RankingSlot[]) => {
  const chunks: RankingSlot[][] = [];

  for (let i = 0; i < slots.length; i += 6) {
    chunks.push(slots.slice(i, i + 6));
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

  const chunks = chunkSlots(buildSlots(rankingList));

  return (
    <div className="px-(--page-px)">
      <div className="flex flex-col">
        {chunks.map((chunk, chunkIndex) => (
          <div
            key={`ranking-chunk-${chunkIndex}`}
            data-chunk-index={chunkIndex}
            className="flex flex-col"
            ref={(el) => {
              chunkRefs.current[chunkIndex] = el;
            }}
          >
            <div className="grid grid-cols-3 gap-x-4 gap-y-5">
              {chunk.map((slot) =>
                slot.type === "ghost" ? (
                  <RankingGhostTile key={`ghost-${slot.id}`} />
                ) : (
                  <button
                    key={`${slot.item.userKey}-${slot.item.drawingId}`}
                    type="button"
                    aria-label={`${slot.item.rank}위 ${slot.item.nickname}${slot.item.isMe ? " (내 그림)" : ""} 상세 보기`}
                    className={`card relative aspect-square w-full appearance-none border-0 p-1.5 transition-transform duration-100 active:scale-[0.98]${
                      slot.item.isMe ? " outline-2 outline-(--color-blue)" : ""
                    }`}
                    onClick={() => {
                      trackClick(FUNNEL_EVENTS.rankingItemClick, {
                        rank: slot.item.rank,
                      });
                      setSelectedRanking(slot.item);
                    }}
                  >
                    <RankBadge
                      rank={slot.item.rank}
                      className="absolute top-1.5 left-1.5 z-10 h-6 min-w-6 px-1 text-[13px]"
                    />
                    <ReplayDrawingCanvas
                      strokes={slot.item.strokes}
                      loop={false}
                      isVisible={visibleChunks[chunkIndex] ?? true}
                      replayKey={chunkReplayKeys[chunkIndex] || 0}
                      targetDurationMs={2000}
                      shouldScale
                      ariaLabel={`${slot.item.rank}위 ${slot.item.nickname} 그림`}
                    />
                  </button>
                ),
              )}
            </div>
            {chunkIndex < chunks.length - 1 && (
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
          title={
            <>
              <span className="text-[19px] font-bold">기억력 점수 분석</span>
              <span className="truncate text-[14px] font-normal text-(--color-grey)">
                <span className="font-bold text-(--color-blue)">
                  {selectedRanking.nickname}
                </span>
                의 솜씨
              </span>
            </>
          }
          rank={selectedRanking.rank}
          isMe={selectedRanking.isMe}
        />
      )}
    </div>
  );
};

export default RankingList;
