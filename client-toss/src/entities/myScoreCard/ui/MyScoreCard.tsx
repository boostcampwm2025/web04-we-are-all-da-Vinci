import {
  DrawingCanvasFrame,
  ReplayDrawingCanvas,
  StaticDrawingCanvas,
} from "@/entities/drawingCanvas";
import { ScoreDetailCard } from "@/entities/scoreDetailCard";
import { AD_GROUP_IDS } from "@/shared/config";
import { BannerAd } from "@/shared/ui/bannerAd";
import { Score } from "@/shared/ui/score";
import type { MyDrawingResponse } from "@toss/shared";
import { BottomSheet } from "@toss/tds-mobile";
import { useState } from "react";

interface MyScoreCardProps {
  drawing: MyDrawingResponse;
  hideHeader?: boolean;
  hideAd?: boolean;
}

const formatScore = (score: number) => score.toFixed(2);

const MyScoreCard = ({
  drawing,
  hideHeader = false,
  hideAd = false,
}: MyScoreCardProps) => {
  const { similarity } = drawing;
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  return (
    <div className="flex w-full flex-col items-center">
      <div className="mt-2 w-full px-(--card-mx)">
        <DrawingCanvasFrame
          as="button"
          onClick={() => setIsDetailOpen(true)}
          ariaLabel="자세한 분석 보기"
        >
          <ReplayDrawingCanvas
            strokes={drawing.strokes}
            loop
            speed={0}
            ariaLabel="나의 그림"
          />
        </DrawingCanvasFrame>
      </div>
      {!hideHeader && (
        <div className="mt-3 flex flex-col items-center">
          <div className="text-xs text-(--color-blue)">
            캔버스를 누르면 자세한 분석을 볼 수 있어요
          </div>
          <div className="mt-1">
            <Score
              value={Number(formatScore(drawing.similarity.score))}
              size="s"
            />
          </div>
        </div>
      )}
      {!hideAd && (
        <div className="w-full px-(--card-mx)">
          <BannerAd adGroupId={AD_GROUP_IDS.BANNER_LIST} className="w-full" />
        </div>
      )}
      {isDetailOpen && (
        <div
          className="animate-slide-up-canvas pointer-events-none fixed inset-x-0 bottom-[calc(60vh+40px)] z-10001 flex justify-center"
          aria-hidden
        >
          <div className="w-56.25 rounded-2xl bg-gray-100 p-2 shadow-md">
            <StaticDrawingCanvas
              strokes={drawing.strokes}
              isPrompt
              ariaLabel="제출한 그림 미리보기"
            />
          </div>
        </div>
      )}
      <BottomSheet
        open={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        maxHeight="60vh"
        expandedMaxHeight="60vh"
        header={
          <BottomSheet.Header>
            <div className="flex w-full items-baseline justify-between">
              <span>점수 분석</span>
              <span className="font-normal">
                <span className="text-base">총점 </span>
                <span className="text-xl font-bold text-(--color-toss-blue)">
                  {formatScore(drawing.similarity.score)}점
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
    </div>
  );
};

export default MyScoreCard;
