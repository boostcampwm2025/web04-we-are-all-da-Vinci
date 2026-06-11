import {
  DrawingCanvasFrame,
  ReplayDrawingCanvas,
} from "@/entities/drawingCanvas";
import { PhaseHeader } from "@/entities/phaseHeader";
import { useStartGame } from "@/feature/playChance";
import { serverTossApi } from "@/shared/api";
import { AD_GROUP_IDS } from "@/shared/config";
import {
  FUNNEL_EVENTS,
  trackClick,
  trackScreen,
  useExitGuard,
  useRequiredState,
  useToast,
} from "@/shared/lib";
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

  useEffect(() => {
    if (!routeState) return;
    trackScreen(FUNNEL_EVENTS.submittedView);
  }, [routeState]);
  const {
    start,
    startWithAd,
    isStarting: isReplaying,
    hasChance,
    adStatus,
    reloadAd,
  } = useStartGame();
  const toast = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitAndView = async () => {
    if (isSubmitting || !routeState) return;
    setIsSubmitting(true);

    try {
      trackClick(FUNNEL_EVENTS.submittedSubmitClick, {
        score: routeState.similarity?.score,
        stroke_count: routeState.strokes.length,
      });
      const { promotionGranted } = await serverTossApi.submitDrawing(
        routeState.strokes,
      );
      trackClick(FUNNEL_EVENTS.submittedSubmitSuccess, {
        promotion_granted: promotionGranted,
        score: routeState.similarity?.score,
        stroke_count: routeState.strokes.length,
      });

      navigate("/", {
        replace: true,
        state: { fromSubmitted: true, promotionGranted },
      });
    } catch (err) {
      console.error("제출 실패:", err);
      trackClick(FUNNEL_EVENTS.submittedSubmitFailed, {
        reason: err instanceof Error ? err.message : String(err),
        score: routeState.similarity?.score,
        stroke_count: routeState.strokes.length,
      });
      toast.show("등록에 실패했어요. 다시 시도해주세요.");
      setIsSubmitting(false);
    }
  };

  // 재도전 = 도전 시작과 동일 흐름(기회로 시작 / 광고 보고 시작) → useStartGame 재사용.
  const handleReplay = async () => {
    const result = hasChance
      ? await start("submitted_replay")
      : await startWithAd("submitted_replay");
    if (result.ok) return;

    if (result.reason === "no_prompt") {
      toast.show("그리기 기회가 부족해요.");
    } else if (result.reason === "error") {
      toast.show("다시 시도해주세요.");
    }
    // ad_not_ready: 버튼이 ready일 때만 연결되므로 정상 흐름엔 도달하지 않음
  };

  if (!routeState) return null;

  const score = routeState.similarity?.score ?? 0;

  // 재도전 버튼 — 잔여 기회가 있으면 광고 면제, 없으면 광고 로드 상태에 따라 라벨·동작이 달라진다.
  const replayButton = hasChance
    ? { label: "광고·등록 없이 재도전", onClick: handleReplay, busy: false }
    : {
        loading: {
          label: "게임 준비 중",
          onClick: undefined,
          busy: true,
        },
        failed: {
          label: "다시시작하기",
          onClick: reloadAd,
          busy: false,
        },
        ready: {
          label: "등록 없이 재도전",
          onClick: handleReplay,
          busy: false,
        },
      }[adStatus];

  return (
    <div className="flex h-full flex-col bg-(--color-page)">
      <Toast
        position="top"
        open={toast.open}
        text={toast.text}
        leftAddon={<Toast.Icon name="icon-check-circle-blue-opacity" />}
        duration={3000}
        onClose={toast.close}
      />

      <PhaseHeader
        title="완성한 그림이에요"
        description={
          "가장 높은 기억력 점수가 랭킹에 반영돼요\n그림의 점수도 자세히 분석해드려요"
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
        <Score value={score} size="l" />
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
                loading={isReplaying || replayButton.busy}
                disabled={isReplaying || isSubmitting || replayButton.busy}
                onClick={replayButton.onClick}
              >
                {replayButton.label}
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
