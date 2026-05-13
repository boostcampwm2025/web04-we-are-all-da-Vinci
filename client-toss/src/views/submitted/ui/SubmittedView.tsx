import type { PlayChanceLayoutContext } from "@/app/layouts/PlayChanceLayout";
import {
  DrawingCanvasFrame,
  ReplayDrawingCanvas,
} from "@/entities/drawingCanvas";
import { PhaseHeader } from "@/entities/phaseHeader";
import { useFullScreenAd } from "@/feature/playChance";
import { serverTossApi } from "@/shared/api";
import { AD_GROUP_IDS } from "@/shared/config";
import { trackClick, useExitGuard, useRequiredState } from "@/shared/lib";
import { BannerAd } from "@/shared/ui/bannerAd";
import { Score } from "@/shared/ui/score";
import type { SimilarityResponse, Stroke } from "@toss/shared";
import { Button, ConfirmDialog, Toast } from "@toss/tds-mobile";
import { useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";

interface SubmittedRouteState {
  promptId: number;
  strokes: Stroke[];
  similarity: SimilarityResponse | null;
  anonymousHash: string;
}

const SubmittedView = () => {
  const navigate = useNavigate();
  const routeState = useRequiredState<SubmittedRouteState>();
  const { showDialog, setShowDialog } = useExitGuard();
  const { hasChance, chargeByAd, startPlay } =
    useOutletContext<PlayChanceLayoutContext>();
  const { isAdLoaded, showAd, adGroupId } = useFullScreenAd();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReplaying, setIsReplaying] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastText, setToastText] = useState("");

  const handleSubmitAndView = async () => {
    if (isSubmitting || !routeState) return;
    setIsSubmitting(true);

    try {
      trackClick("submitted_submit_click");
      const { promotionGranted } = await serverTossApi.submitDrawing(
        routeState.strokes,
      );

      navigate("/", {
        replace: true,
        state: { fromSubmitted: true, promotionGranted },
      });
    } catch (err) {
      console.error("제출 실패:", err);
      setToastText("등록에 실패했어요. 다시 시도해주세요.");
      setToastOpen(true);
      setIsSubmitting(false);
    }
  };

  const handleReplay = async () => {
    if (isReplaying) return;
    setIsReplaying(true);
    try {
      // chance가 있으면 광고 면제 (라벨 "광고·등록 없이 재도전"과 일치)
      if (!hasChance && isAdLoaded) {
        await showAd();
        await chargeByAd({ adGroupId });
      }
      const prompt = await startPlay();
      if (!prompt) {
        setToastText("그리기 기회가 부족해요.");
        setToastOpen(true);
        setIsReplaying(false);
        return;
      }

      navigate("/memorize", {
        state: {
          promptId: prompt.promptId,
          promptStrokes: prompt.strokes,
          anonymousHash: routeState?.anonymousHash ?? "local",
        },
        replace: true,
      });
    } catch {
      setToastText("다시 시도해주세요.");
      setToastOpen(true);
      setIsReplaying(false);
    }
  };

  if (!routeState) return null;

  const score = routeState.similarity?.score ?? 0;

  return (
    <div className="flex h-full flex-col bg-white">
      <Toast
        position="top"
        open={toastOpen}
        text={toastText}
        leftAddon={<Toast.Icon name="icon-check-circle-blue-opacity" />}
        duration={3000}
        onClose={() => setToastOpen(false)}
      />

      <PhaseHeader
        title="완성한 그림이에요"
        description={
          "등록하면 오늘 그린 최고 점수가 랭킹에 반영돼요\n그림의 점수도 자세히 분석해드려요"
        }
      />

      <div className="mt-2 mb-(--card-mx) px-(--card-mx)">
        <DrawingCanvasFrame>
          <ReplayDrawingCanvas
            strokes={routeState.strokes}
            loop
            speed={0}
            ariaLabel="완성한 그림 리플레이"
          />
        </DrawingCanvasFrame>
      </div>

      <div className="flex flex-1 flex-col justify-between pb-(--card-mx)">
        <Score value={Math.round(score)} size="l" />
        <div className="flex w-full flex-col gap-3">
          <div className="px-(--card-mx)">
            <BannerAd adGroupId={AD_GROUP_IDS.BANNER_LIST} type="list" />
          </div>
          <div className="flex gap-3 px-(--page-px)">
            <div className="flex-1">
              <Button
                color="primary"
                variant="weak"
                display="block"
                loading={isReplaying}
                disabled={isReplaying || isSubmitting}
                onClick={handleReplay}
              >
                {hasChance ? "광고·등록 없이 재도전" : "등록 없이 재도전"}
              </Button>
            </div>
            <div className="flex-1">
              <Button
                color="primary"
                display="block"
                loading={isSubmitting}
                disabled={isSubmitting || isReplaying}
                onClick={handleSubmitAndView}
              >
                이 그림으로 등록
              </Button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        title="게임에서 나가시겠어요?"
        description="등록하지 않은 그림은 사라져요"
        confirmButton={
          <ConfirmDialog.ConfirmButton
            onClick={() => navigate("/", { replace: true })}
          >
            나가기
          </ConfirmDialog.ConfirmButton>
        }
        cancelButton={
          <ConfirmDialog.CancelButton onClick={() => setShowDialog(false)}>
            계속 보기
          </ConfirmDialog.CancelButton>
        }
      />
    </div>
  );
};

export default SubmittedView;
