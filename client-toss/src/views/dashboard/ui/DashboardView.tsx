import {
  NotificationCenterSheet,
  useNotificationAutoPrompt,
} from "@/feature/notification";
import { useFullScreenAd, usePlayChanceContext } from "@/feature/playChance";
import {
  FUNNEL_EVENTS,
  formatLocalDate,
  getAnonymousHash,
  getErrorMessage,
  trackClick,
  useExitGuard,
} from "@/shared/lib";
import { Button, ConfirmDialog, Toast } from "@toss/tds-mobile";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ChallengeCard from "./ChallengeCard";
import StreakStatsCard from "./StreakStatsCard";
import TodayDavinciCard from "./TodayDavinciCard";
import TodayMissionCard from "./TodayMissionCard";

type PlayStartSource = "auto" | "cta" | "retry";

const DashboardView = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state: locationState } = location;
  const { showDialog, setShowDialog, exit } = useExitGuard();
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [playedToday, setPlayedToday] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastText, setToastText] = useState("일시적 오류가 발생했어요");
  const anonymousHashRef = useRef<string>("local");
  const autoStartedRef = useRef(false);
  const {
    chanceCount,
    hasChance,
    isLoading: isChanceLoading,
    chargeByAd,
    startPlay,
    refresh: refreshChance,
  } = usePlayChanceContext();
  const { adStatus, isAdLoaded, showAd, reloadAd, adGroupId } =
    useFullScreenAd();

  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const notificationAutoPrompt = useNotificationAutoPrompt(playedToday);

  const startGame = useCallback(
    async (source: PlayStartSource = "cta") => {
      if (isStartingGame) return;
      setIsStartingGame(true);
      setError(null);
      trackClick(FUNNEL_EVENTS.playStartAttempt, {
        source,
        has_chance: hasChance,
        chance_count: chanceCount,
      });
      try {
        const prompt = await startPlay();
        if (!prompt) {
          trackClick(FUNNEL_EVENTS.playStartFailed, {
            source,
            reason: "empty_prompt_response",
          });
          setIsStartingGame(false);
          return;
        }

        // 게임 시작 시점에 자동시작 게이트를 닫는다 — 제출 없이 이탈해도 재자동시작/이중차감 방지
        localStorage.setItem(
          `lastPlayed_${anonymousHashRef.current}`,
          formatLocalDate(),
        );

        trackClick(FUNNEL_EVENTS.playStartSuccess, {
          source,
          prompt_id: prompt.promptId,
        });

        navigate("/memorize", {
          state: {
            promptId: prompt.promptId,
            promptStrokes: prompt.strokes,
            anonymousHash: anonymousHashRef.current,
          },
          replace: true,
        });
      } catch (err) {
        console.error("프롬프트 로드 실패:", err);
        trackClick(FUNNEL_EVENTS.playStartFailed, {
          source,
          reason: getErrorMessage(err),
        });
        setError("서버 응답이 늦어지고 있어요. 다시 시도해주세요.");
        setIsStartingGame(false);
      }
    },
    [chanceCount, hasChance, isStartingGame, navigate, startPlay],
  );

  useEffect(() => {
    const fromSubmitted = (locationState as { fromSubmitted?: boolean })
      ?.fromSubmitted;

    const init = async () => {
      const hash = await getAnonymousHash();
      anonymousHashRef.current = hash;

      // 자동시작 플래그(게임 시작 시 기록)에서 "오늘 플레이함"을 파생 — 알림 자동 시트 게이트.
      // 모든 경로(첫 방문/제출 복귀/재방문)에서 분기보다 먼저 일관되게 세팅한다.
      const today = formatLocalDate();
      const lastPlayed = localStorage.getItem(`lastPlayed_${hash}`);
      setPlayedToday(lastPlayed === today);

      if (fromSubmitted) {
        // state를 즉시 제거하여 재마운트 시 토스트 재표시 방지
        window.history.replaceState({}, "");

        const promotionGranted = (
          locationState as { promotionGranted?: boolean }
        )?.promotionGranted;
        if (promotionGranted != null) {
          setToastText(
            promotionGranted ? "포인트 지급이 완료됐어요" : "그림을 등록했어요",
          );
          setToastOpen(true);
        }

        setInitialLoading(false);
        return;
      }

      if (lastPlayed === today) {
        setInitialLoading(false);
        return;
      }

      // effect가 두 번 실행돼도 자동시작은 마운트당 1회만 — startPlay 이중 호출 방지
      if (autoStartedRef.current) {
        setInitialLoading(false);
        return;
      }
      autoStartedRef.current = true;

      // 첫 방문: initialLoading=true 상태로 게임 시작 (로딩 화면 유지)
      try {
        await startGame("auto");
      } finally {
        setInitialLoading(false);
      }
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationState]);

  const handleRetry = async () => {
    if (isStartingGame) return;
    setIsStartingGame(true);
    trackClick(FUNNEL_EVENTS.playStartAttempt, {
      source: "retry",
      has_chance: hasChance,
      chance_count: chanceCount,
    });
    try {
      if (isAdLoaded) {
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
      } else {
        // 버튼은 adStatus가 "ready"일 때만 handleRetry를 연결하므로 정상 흐름엔 도달하지 않는 방어 가드.
        trackClick(FUNNEL_EVENTS.adRewardFailed, {
          ad_group_id: adGroupId,
          reason: "ad_not_ready",
        });
        return;
      }
      const prompt = await startPlay();
      if (!prompt) {
        trackClick(FUNNEL_EVENTS.playStartFailed, {
          source: "retry",
          reason: "empty_prompt_response",
        });
        await refreshChance();
        setToastText(
          "그리기 기회를 다시 확인했어요. 잠시 후 다시 시도해주세요.",
        );
        setToastOpen(true);
        return;
      }

      localStorage.setItem(
        `lastPlayed_${anonymousHashRef.current}`,
        formatLocalDate(),
      );

      trackClick(FUNNEL_EVENTS.playStartSuccess, {
        source: "retry",
        prompt_id: prompt.promptId,
      });

      navigate("/memorize", {
        state: {
          promptId: prompt.promptId,
          promptStrokes: prompt.strokes,
          anonymousHash: anonymousHashRef.current,
        },
        replace: true,
      });
    } catch (err) {
      console.error("[handleRetry 실패]", err);
      trackClick(FUNNEL_EVENTS.playStartFailed, {
        source: "retry",
        reason: getErrorMessage(err),
      });
      setToastText("일시적 오류가 발생했어요");
      setToastOpen(true);
    } finally {
      setIsStartingGame(false);
    }
  };

  // 잔여 기회가 없을 때의 광고 보상 버튼 — 광고 로드 상태에 따라 라벨·동작이 달라진다.
  const adButton = {
    loading: { label: "광고 준비 중이에요", onClick: undefined, busy: true },
    failed: { label: "광고 다시 불러오기", onClick: reloadAd, busy: false },
    ready: {
      label: "5초 광고 보고 도전하기",
      onClick: handleRetry,
      busy: false,
    },
  }[adStatus];

  let cta;
  if (isChanceLoading) {
    cta = (
      <Button color="primary" display="block" loading disabled>
        도전 기회 확인 중
      </Button>
    );
  } else if (hasChance) {
    cta = (
      <Button
        color="primary"
        display="block"
        loading={isStartingGame}
        disabled={isStartingGame}
        onClick={() => startGame("cta")}
      >
        {`광고 없이 ${chanceCount}번 도전`}
      </Button>
    );
  } else {
    cta = (
      <Button
        color="primary"
        display="block"
        loading={isStartingGame || adButton.busy}
        disabled={isStartingGame || adButton.busy}
        onClick={adButton.onClick}
      >
        {adButton.label}
      </Button>
    );
  }

  if (initialLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-(--color-grey)">준비 중이에요</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-(--page-px)">
        <p className="text-center text-(--color-grey)">{error}</p>
        <Button size="large" onClick={() => startGame("cta")}>
          다시 시도해요
        </Button>
      </div>
    );
  }

  return (
    <div
      data-no-safe-area-bottom
      className="flex h-full flex-col bg-(--color-page)"
    >
      <Toast
        position="top"
        open={toastOpen}
        text={toastText}
        leftAddon={<Toast.Icon name="icon-check-circle-blue-opacity" />}
        duration={3000}
        onClose={() => setToastOpen(false)}
      />

      <main className="min-h-0 flex-1 overflow-y-auto px-(--page-px) pt-3 pb-[calc(env(safe-area-inset-bottom)+56px)]">
        <div className="flex flex-col gap-3">
          <StreakStatsCard />
          <ChallengeCard cta={cta} />
          <TodayMissionCard />
          <TodayDavinciCard />
        </div>
      </main>

      <NotificationCenterSheet
        open={notificationAutoPrompt.open}
        onClose={notificationAutoPrompt.close}
      />

      <ConfirmDialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        title="우리 모두 다빈치를 종료할까요?"
        confirmButton={
          <ConfirmDialog.ConfirmButton onClick={exit}>
            종료하기
          </ConfirmDialog.ConfirmButton>
        }
        cancelButton={
          <ConfirmDialog.CancelButton onClick={() => setShowDialog(false)}>
            계속 둘러보기
          </ConfirmDialog.CancelButton>
        }
      />
    </div>
  );
};

export default DashboardView;
