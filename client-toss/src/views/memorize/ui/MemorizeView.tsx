import {
  DrawingCanvasFrame,
  StaticDrawingCanvas,
} from "@/entities/drawingCanvas";
import { PhaseHeader } from "@/entities/phaseHeader";
import { useRequirePlaySession } from "@/feature/playChance";
import { AD_GROUP_IDS } from "@/shared/config";
import {
  FUNNEL_EVENTS,
  MEMORIZE_SECONDS,
  trackScreen,
  useCountdown,
  useExitGuard,
  useRequiredState,
} from "@/shared/lib";
import { BannerAd } from "@/shared/ui/bannerAd";
import type { Stroke } from "@toss/shared";
import { ConfirmDialog } from "@toss/tds-mobile";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface MemorizeRouteState {
  promptId: number;
  promptStrokes: Stroke[];
  anonymousHash: string;
}

const MemorizeView = () => {
  const navigate = useNavigate();
  const { isCheckingSession } = useRequirePlaySession();
  const routeState = useRequiredState<MemorizeRouteState>();
  const { showDialog, setShowDialog } = useExitGuard();

  useEffect(() => {
    if (isCheckingSession || !routeState) return;
    trackScreen(FUNNEL_EVENTS.memorizeView, {
      prompt_id: routeState.promptId,
    });
  }, [isCheckingSession, routeState]);
  const [endTime] = useState(() => {
    const stored = sessionStorage.getItem("memorizeEndTime");
    const now = Date.now();
    if (stored) {
      const parsed = Number(stored);
      // 유효한 미래 시간만 사용, 과거면 새로 생성
      if (parsed > now) return parsed;
    }
    const et = now + MEMORIZE_SECONDS * 1000;
    sessionStorage.setItem("memorizeEndTime", String(et));
    return et;
  });

  const goToDrawing = () => {
    if (!routeState) return;
    sessionStorage.removeItem("memorizeEndTime");
    navigate("/drawing", {
      state: {
        promptId: routeState.promptId,
        promptStrokes: routeState.promptStrokes,
        anonymousHash: routeState.anonymousHash,
      },
      replace: true,
    });
  };

  const { timeLeft, progress } = useCountdown(
    endTime,
    MEMORIZE_SECONDS,
    goToDrawing,
  );

  if (isCheckingSession || !routeState) return null;

  return (
    <div
      data-no-safe-area-bottom
      className="flex h-full flex-col bg-(--color-page)"
    >
      <PhaseHeader
        title="이 그림을 외워주세요"
        description={`${timeLeft}초 뒤에 똑같이 그려야 해요\n중간에 나가면 도전 기회가 사라져요`}
        progress={progress}
      />

      <div className="min-h-0 flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
        <div className="mt-2 px-(--card-mx)">
          <DrawingCanvasFrame>
            <StaticDrawingCanvas
              strokes={routeState.promptStrokes}
              isPrompt
              ariaLabel="외워야 할 그림"
            />
          </DrawingCanvasFrame>
        </div>

        <div className="px-(--card-mx)">
          <BannerAd type="feed" adGroupId={AD_GROUP_IDS.BANNER_FEED} />
        </div>
      </div>

      <ConfirmDialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        title="지금 나가면 기회가 사라져요"
        description="오늘 도전이 그대로 끝나요"
        confirmButton={
          <ConfirmDialog.ConfirmButton
            onClick={() => {
              sessionStorage.removeItem("memorizeEndTime");
              navigate("/", { replace: true });
            }}
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
