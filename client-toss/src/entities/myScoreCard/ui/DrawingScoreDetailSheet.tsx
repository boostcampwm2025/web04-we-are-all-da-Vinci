import { StaticDrawingCanvas } from "@/entities/drawingCanvas";
import { ScoreDetailCard } from "@/entities/scoreDetailCard";
import { formatScore } from "@/shared/lib";
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
}

const DrawingScoreDetailSheet = ({
  open,
  onClose,
  strokes,
  similarity,
  title = "기억력 점수 분석",
  previewAriaLabel = "제출한 그림 미리보기",
}: DrawingScoreDetailSheetProps) => (
  <>
    {open && (
      <div
        className="animate-slide-up-canvas pointer-events-none fixed inset-x-0 bottom-[calc(60vh+40px)] z-10001 flex justify-center"
        aria-hidden
      >
        <div className="w-56.25 rounded-(--radius-card) bg-(--color-card) p-2 shadow-md">
          <StaticDrawingCanvas
            strokes={strokes}
            isPrompt
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
          <div className="flex w-full items-baseline justify-between">
            <span>{title}</span>
            <span className="font-normal">
              <span className="text-base">총점 </span>
              <span className="text-xl font-bold text-(--color-toss-blue)">
                {formatScore(similarity.score)}점
              </span>
            </span>
          </div>
        </BottomSheet.Header>
      }
    >
      <div className="flex w-full flex-col items-center gap-4 px-(--page-px) pt-2 pb-[env(safe-area-inset-bottom)]">
        <ScoreDetailCard
          strokeMatchSimilarity={similarity.strokeMatchSimilarity}
          shapeSimilarity={similarity.shapeSimilarity}
          penalty={similarity.penalty}
        />
      </div>
    </BottomSheet>
  </>
);

export default DrawingScoreDetailSheet;
