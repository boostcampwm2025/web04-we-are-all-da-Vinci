import { PhaseHeader } from "@/entities/phaseHeader";
import { drawPromptOnCanvas, useCanvasSetup } from "@/feature/drawing";
import {
  MEMORIZE_SECONDS,
  useCountdown,
  useExitGuard,
  useRequiredState,
} from "@/shared/lib";
import { BannerAd } from "@/shared/ui/bannerAd";
import type { Stroke } from "@toss/shared";
import { ConfirmDialog } from "@toss/tds-mobile";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

interface MemorizeRouteState {
  promptId: number;
  promptStrokes: Stroke[];
  anonymousHash: string;
}

const MemorizeView = () => {
  const navigate = useNavigate();
  const routeState = useRequiredState<MemorizeRouteState>();
  const { showDialog, setShowDialog } = useExitGuard();
  const { containerRef, canvasRef, ctxRef, canvasSize } = useCanvasSetup();

  const { timeLeft, progress } = useCountdown(MEMORIZE_SECONDS, () => {
    if (!routeState) return;
    navigate("/drawing", {
      state: {
        promptId: routeState.promptId,
        promptStrokes: routeState.promptStrokes,
        anonymousHash: routeState.anonymousHash,
      },
      replace: true,
    });
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx || !routeState || canvasSize === 0) return;

    console.log("[Memorize] drawing prompt:", {
      canvasSize,
      canvasWidth: canvas.width,
      dpr: window.devicePixelRatio,
      strokeCount: routeState.promptStrokes.length,
    });
    drawPromptOnCanvas(canvas, ctx, routeState.promptStrokes);
  }, [canvasRef, ctxRef, routeState, canvasSize]);

  if (!routeState) return null;

  return (
    <div className="flex h-full flex-col bg-white pb-0!">
      <PhaseHeader
        title="기억하세요!"
        description={`${timeLeft}초 동안 그림을 기억하세요`}
        progress={progress}
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-(--card-mx) mt-2 rounded-2xl bg-gray-100 p-3">
          <div
            ref={containerRef}
            className="flex w-full items-center justify-center rounded-xl bg-white shadow-sm"
          >
            <canvas ref={canvasRef} className="rounded-xl" />
          </div>
        </div>

        <BannerAd type="feed" adGroupId="ait-ad-test-native-image-id" />
      </div>

      <ConfirmDialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        title="나가시겠어요?"
        description="나가면 처음부터 다시 시작해야 해요"
        confirmButton={
          <ConfirmDialog.ConfirmButton
            onClick={() => navigate("/", { replace: true })}
          >
            나가기
          </ConfirmDialog.ConfirmButton>
        }
        cancelButton={
          <ConfirmDialog.CancelButton onClick={() => setShowDialog(false)}>
            계속하기
          </ConfirmDialog.CancelButton>
        }
      />
    </div>
  );
};

export default MemorizeView;
