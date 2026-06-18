import {
  DrawingCanvasFrame,
  ReplayDrawingCanvas,
} from "@/entities/drawingCanvas";
import { AD_GROUP_IDS } from "@/shared/config";
import { formatScore } from "@/shared/lib";
import { BannerAd } from "@/shared/ui/bannerAd";
import { Score } from "@/shared/ui/score";
import type { MyDrawingResponse } from "@toss/shared";
import { useState } from "react";
import DrawingScoreDetailSheet from "./DrawingScoreDetailSheet";

interface MyScoreCardProps {
  drawing: MyDrawingResponse;
  hideHeader?: boolean;
  hideAd?: boolean;
}

const MyScoreCard = ({
  drawing,
  hideHeader = false,
  hideAd = false,
}: MyScoreCardProps) => {
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
            그림을 누르면 자세한 분석을 볼 수 있어요
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
      <DrawingScoreDetailSheet
        open={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        strokes={drawing.strokes}
        similarity={drawing.similarity}
      />
    </div>
  );
};

export default MyScoreCard;
