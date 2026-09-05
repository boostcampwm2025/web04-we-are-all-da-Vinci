import {
  DrawingCanvasFrame,
  ReplayDrawingCanvas,
} from "@/entities/drawingCanvas";
import { useSubmitDrawing } from "@/entities/myScoreCard";
import { PhaseHeader } from "@/entities/phaseHeader";
import { useStartGame } from "@/feature/playChance";
import { AD_GROUP_IDS } from "@/shared/config";
import {
  FUNNEL_EVENTS,
  trackClick,
  trackScreen,
  useExitGuard,
  useInFlight,
  useRequiredState,
  useToast,
} from "@/shared/lib";
import { BannerAd } from "@/shared/ui/bannerAd";
import { Score } from "@/shared/ui/score";
import type { SimilarityResponse, Stroke } from "@toss/shared";
import { Button, ConfirmDialog, Toast } from "@toss/tds-mobile";
import { match } from "ts-pattern";
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
  // 제출 성공 시 랭킹·시상대·미션·아카이브 캐시 무효화는 mutation(entities/myScoreCard)이 소유한다.
  const { mutateAsync: submitDrawing } = useSubmitDrawing();

  // 서버의 saveDrawingWithRanking에는 멱등성이 없어 호출마다 그림이 한 장씩 저장된다.
  // isSubmitting(useState)은 갱신이 다음 렌더에 반영되므로 같은 렌더 사이클의
  // 두 번째 클릭을 막지 못한다 — 더블탭이면 두 장이 등록되고 랭킹·미션도 두 번 오른다.
  // isSubmitting은 이제 로딩 표시 전용이다.
  const guardSubmit = useInFlight<void>();

  const handleSubmitAndView = () =>
    guardSubmit(async () => {
      if (!routeState) return;
      setIsSubmitting(true);

      try {
        trackClick(FUNNEL_EVENTS.submittedSubmitClick, {
          score: routeState.similarity?.score,
          stroke_count: routeState.strokes.length,
        });
        await submitDrawing(routeState.strokes);

        trackClick(FUNNEL_EVENTS.submittedSubmitSuccess, {
          score: routeState.similarity?.score,
          stroke_count: routeState.strokes.length,
        });

        navigate("/", {
          replace: true,
          state: { fromSubmitted: true },
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
    });

  // 재도전 = 도전 시작과 동일 흐름(기회로 시작 / 광고 보고 시작) → useStartGame 재사용.
  const handleReplay = async () => {
    const result = hasChance
      ? await start("submitted_replay")
      : await startWithAd("submitted_replay");
    if (result.ok) return;

    match(result.reason)
      .with("no_prompt", () => toast.show("그리기 기회가 부족해요."))
      .with("error", () => toast.show("다시 시도해주세요."))
      // 버튼이 ready일 때만 연결되므로 정상 흐름엔 도달하지 않지만,
      // 로드 상태가 클릭 직전에 풀리는 경우까지 침묵하지 않도록 안내한다.
      .with("ad_not_ready", () =>
        toast.show("광고를 준비 중이에요. 잠시 후 다시 눌러주세요."),
      )
      .exhaustive();
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
