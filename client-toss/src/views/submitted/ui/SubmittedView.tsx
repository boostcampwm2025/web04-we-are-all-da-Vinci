import { drawStrokesOnCanvas, useCanvasSetup } from "@/feature/drawing";
import { usePlayChance } from "@/feature/playChance";
import { serverTossApi } from "@/shared/api";
import { trackClick, useExitGuard, useRequiredState } from "@/shared/lib";
import { BannerAd } from "@/shared/ui/bannerAd";
import { Score } from "@/shared/ui/score";
import type { SimilarityResponse, Stroke } from "@toss/shared";
import { Button, ConfirmDialog, Toast } from "@toss/tds-mobile";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

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
  const { containerRef, canvasRef, ctxRef, canvasSize } = useCanvasSetup();
  const { charge, startPlay } = usePlayChance();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReplaying, setIsReplaying] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastText, setToastText] = useState("");

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx || !routeState || canvasSize === 0) return;

    drawStrokesOnCanvas(canvas, ctx, routeState.strokes, true);
  }, [canvasRef, ctxRef, routeState, canvasSize]);

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
      setToastText("제출에 실패했어요. 다시 시도해주세요.");
      setToastOpen(true);
      setIsSubmitting(false);
    }
  };

  const handleReplay = async () => {
    if (isReplaying) return;
    setIsReplaying(true);
    try {
      try {
        await serverTossApi.recordAdView();
      } catch {
        // best-effort
      }
      await charge();
      const started = await startPlay();
      if (!started) {
        setIsReplaying(false);
        return;
      }

      const { promptId, strokes } = await serverTossApi.getPrompt();
      navigate("/memorize", {
        state: {
          promptId,
          promptStrokes: strokes,
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

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col items-center px-(--page-px) pt-4">
          <h1 className="mb-3 text-[22px] font-bold">그림을 완성했어요</h1>
        </div>

        <div className="mx-(--card-mx) rounded-2xl bg-gray-100 p-3">
          <div
            ref={containerRef}
            className="flex w-full items-center justify-center rounded-xl bg-white shadow-sm"
          >
            <canvas ref={canvasRef} className="rounded-xl" />
          </div>
        </div>

        <div className="flex flex-col items-center py-4">
          <Score value={Math.round(score)} size="l" />
          <p className="mt-2 text-sm text-(--color-grey)">
            저장하면 랭킹에 등록돼요
          </p>
        </div>

        <div className="pb-3">
          <BannerAd adGroupId="ait-ad-test-native-image-id" type="list" />
        </div>
      </div>

      <div className="flex gap-3 px-(--page-px) py-3">
        <div className="flex-1">
          <Button
            color="primary"
            variant="weak"
            display="block"
            loading={isReplaying}
            disabled={isReplaying || isSubmitting}
            onClick={handleReplay}
          >
            다시하기
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
            저장하기
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        title="게임에서 나가시겠어요?"
        description="저장하지 않은 그림은 사라져요"
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
