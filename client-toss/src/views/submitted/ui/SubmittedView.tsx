import {
  DrawingCanvasFrame,
  ReplayDrawingCanvas,
} from "@/entities/drawingCanvas";
import { PhaseHeader } from "@/entities/phaseHeader";
import { useFullScreenAd, usePlayChanceContext } from "@/feature/playChance";
import { serverTossApi } from "@/shared/api";
import { AD_GROUP_IDS } from "@/shared/config";
import {
  FUNNEL_EVENTS,
  getErrorMessage,
  trackClick,
  trackScreen,
  useExitGuard,
  useRequiredState,
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
  const { hasChance, chargeByAd, startPlay } = usePlayChanceContext();
  const { adStatus, isAdLoaded, showAd, reloadAd, adGroupId } =
    useFullScreenAd();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReplaying, setIsReplaying] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastText, setToastText] = useState("");

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
      setToastText("등록에 실패했어요. 다시 시도해주세요.");
      setToastOpen(true);
      setIsSubmitting(false);
    }
  };

  const handleReplay = async () => {
    if (isReplaying) return;
    setIsReplaying(true);
    trackClick(FUNNEL_EVENTS.playStartAttempt, {
      source: "submitted_replay",
      has_chance: hasChance,
    });
    try {
      // chance가 있으면 광고 면제 (라벨 "광고·등록 없이 재도전"과 일치)
      if (!hasChance && isAdLoaded) {
        trackClick(FUNNEL_EVENTS.adRewardAttempt, { ad_group_id: adGroupId });
        try {
          await showAd();
          const count = await chargeByAd({ adGroupId });
          trackClick(FUNNEL_EVENTS.adRewardSuccess, {
            ad_group_id: adGroupId,
            chance_count: count,
          });
        } catch (err) {
          trackClick(FUNNEL_EVENTS.adRewardFailed, {
            ad_group_id: adGroupId,
            reason: getErrorMessage(err),
          });
          throw err;
        }
      } else if (!hasChance) {
        // 버튼은 adStatus가 "ready"일 때만 handleReplay를 연결하므로 정상 흐름엔 도달하지 않는 방어 가드.
        trackClick(FUNNEL_EVENTS.adRewardFailed, {
          ad_group_id: adGroupId,
          reason: "ad_not_ready",
        });
        setIsReplaying(false);
        return;
      }
      const prompt = await startPlay();
      if (!prompt) {
        trackClick(FUNNEL_EVENTS.playStartFailed, {
          source: "submitted_replay",
          reason: "empty_prompt_response",
        });
        setToastText("그리기 기회가 부족해요.");
        setToastOpen(true);
        setIsReplaying(false);
        return;
      }

      trackClick(FUNNEL_EVENTS.playStartSuccess, {
        source: "submitted_replay",
        prompt_id: prompt.promptId,
      });

      navigate("/memorize", {
        state: {
          promptId: prompt.promptId,
          promptStrokes: prompt.strokes,
          anonymousHash: routeState?.anonymousHash ?? "local",
        },
        replace: true,
      });
    } catch (err) {
      trackClick(FUNNEL_EVENTS.playStartFailed, {
        source: "submitted_replay",
        reason: getErrorMessage(err),
      });
      setToastText("다시 시도해주세요.");
      setToastOpen(true);
      setIsReplaying(false);
    }
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
        open={toastOpen}
        text={toastText}
        leftAddon={<Toast.Icon name="icon-check-circle-blue-opacity" />}
        duration={3000}
        onClose={() => setToastOpen(false)}
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
