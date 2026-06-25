import { ReplayDrawingCanvas } from "@/entities/drawingCanvas";
import { ScoreDetailCard } from "@/entities/scoreDetailCard";
import { AD_GROUP_IDS } from "@/shared/config";
import { formatScore } from "@/shared/lib";
import { BannerAd } from "@/shared/ui/bannerAd";
import { RankBadge } from "@/shared/ui/rankBadge";
import type { SimilarityResponse, Stroke } from "@toss/shared";
import { BottomSheet } from "@toss/tds-mobile";
import type { ReactNode } from "react";

interface DrawingScoreDetailSheetProps {
  open: boolean;
  onClose: () => void;
  strokes: Stroke[];
  similarity: SimilarityResponse;
  title?: ReactNode;
  previewAriaLabel?: string;
  rank?: number;
  isMe?: boolean;
}

const DrawingScoreDetailSheet = ({
  open,
  onClose,
  strokes,
  similarity,
  title = "기억력 점수 분석",
  previewAriaLabel = "제출한 그림 미리보기",
  rank,
  isMe = false,
}: DrawingScoreDetailSheetProps) => (
  <>
    {open && (
      <div
        className="animate-slide-up-canvas pointer-events-none fixed inset-x-0 bottom-[calc(60vh+40px)] z-10001 flex justify-center"
        aria-hidden
      >
        <div className="relative w-56.25 rounded-(--radius-card) bg-(--color-card) p-2 shadow-md">
          {rank !== undefined && (
            <RankBadge
              rank={rank}
              className="absolute top-1.5 left-1.5 z-10 h-6 min-w-6 px-1 text-[13px] shadow-sm"
            />
          )}
          {isMe && (
            <span className="absolute -top-2.5 left-1/2 z-10 -translate-x-1/2 rounded-full bg-(--color-blue) px-2.5 py-0.5 text-xs font-bold whitespace-nowrap text-white shadow-md">
              내가 그린 그림
            </span>
          )}
          <ReplayDrawingCanvas
            strokes={strokes}
            loop={false}
            targetDurationMs={2000}
            shouldScale
            ariaLabel={previewAriaLabel}
          />
        </div>
      </div>
    )}
    <BottomSheet
      open={open}
      onClose={onClose}
      maxHeight="60vh"
      expandedMaxHeight="60vh"
      header={
        <BottomSheet.Header>
          <div className="flex w-full items-center justify-between gap-2">
            {/* title 슬롯은 flex column — 라벨 + 닉네임 2줄을 촘촘히 쌓는다. */}
            <span className="flex min-w-0 flex-col leading-tight">{title}</span>
            <span className="shrink-0 font-normal">
              <span className="text-sm">총점 </span>
              <span className="text-xl font-bold text-(--color-toss-blue)">
                {formatScore(similarity.score)}점
              </span>
            </span>
          </div>
        </BottomSheet.Header>
      }
    >
      <div className="flex w-full flex-col">
        <div className="flex w-full flex-col items-center gap-4 px-(--page-px) pt-2">
          <ScoreDetailCard
            strokeMatchSimilarity={similarity.strokeMatchSimilarity}
            shapeSimilarity={similarity.shapeSimilarity}
            penalty={similarity.penalty}
          />
        </div>
        {/* 리스트형 광고는 시트 맨 밑에 상하 여백 없이 꽉 채워 붙인다. */}
        <BannerAd
          adGroupId={AD_GROUP_IDS.BANNER_LIST}
          type="list"
          className="w-full"
        />
      </div>
    </BottomSheet>
  </>
);

export default DrawingScoreDetailSheet;
