import { useMyDrawings } from "@/entities/myScoreCard";
import { useFullScreenAd, usePlayChanceContext } from "@/feature/playChance";
import {
  getCachedNickname,
  serverTossApi,
  setCachedNickname,
} from "@/shared/api";
import {
  FUNNEL_EVENTS,
  formatLocalDate,
  getAnonymousHash,
  trackClick,
  useExitGuard,
} from "@/shared/lib";
import { Button, ConfirmDialog, Tab, Toast } from "@toss/tds-mobile";
import { useCallback, useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import InfoTicker from "./InfoTicker";

const TAB_PATHS = ["/", "/ranking", "/quest"] as const;
type PlayStartSource = "auto" | "cta" | "retry";

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const DashboardView = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state: locationState } = location;
  const { showDialog, setShowDialog, exit } = useExitGuard();
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastText, setToastText] = useState("일시적 오류가 발생했어요");
  const anonymousHashRef = useRef<string>("local");
  const autoStartedRef = useRef(false);
  const { myDrawings, isLoading, refetch: refetchDrawings } = useMyDrawings();
  const {
    chanceCount,
    hasChance,
    isLoading: isChanceLoading,
    chargeByAd,
    startPlay,
    refresh: refreshChance,
  } = usePlayChanceContext();
  const { isAdLoaded, showAd, adGroupId } = useFullScreenAd();

  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nickname, setNickname] = useState<string>(
    () => getCachedNickname() ?? "",
  );

  const selectedTab = Math.max(
    0,
    TAB_PATHS.indexOf(location.pathname as (typeof TAB_PATHS)[number]),
  );

  useEffect(() => {
    if (nickname) return;
    let cancelled = false;
    serverTossApi
      .getMe()
      .then((info) => {
        if (cancelled) return;
        setCachedNickname(info.nickname);
        setNickname(info.nickname);
      })
      .catch((err) => {
        console.error("[닉네임 조회 실패, 무시]", err);
      });
    return () => {
      cancelled = true;
    };
  }, [nickname]);

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

      if (fromSubmitted) {
        // state를 즉시 제거하여 재마운트 시 토스트 재표시 방지
        window.history.replaceState({}, "");

        refetchDrawings();

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

      const today = formatLocalDate();
      const lastPlayed = localStorage.getItem(`lastPlayed_${hash}`);

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

      <div className="shrink-0 bg-(--color-page)">
        <Tab onChange={(index) => navigate(TAB_PATHS[index] ?? "/")}>
          <Tab.Item selected={selectedTab === 0}>오늘 그린 그림</Tab.Item>
          <Tab.Item selected={selectedTab === 1}>오늘의 다빈치</Tab.Item>
          <Tab.Item selected={selectedTab === 2}>오늘의 퀘스트</Tab.Item>
        </Tab>
        <InfoTicker />
      </div>

      <main className="min-h-0 flex-1 overflow-y-auto">
        <Outlet
          context={{
            nickname,
            myDrawings,
            isMyDrawingsLoading: isLoading,
          }}
        />
      </main>

      <section className="shrink-0 bg-(--color-page) px-(--page-px) pt-3 pb-[env(safe-area-inset-bottom)]">
        {isChanceLoading ? (
          <Button color="primary" display="block" loading disabled>
            도전 기회 확인 중
          </Button>
        ) : hasChance ? (
          <Button
            color="primary"
            display="block"
            loading={isStartingGame}
            disabled={isStartingGame}
            onClick={() => startGame("cta")}
          >
            광고 없이 {chanceCount}번 도전
          </Button>
        ) : (
          <Button
            color="primary"
            display="block"
            loading={isStartingGame}
            disabled={isStartingGame}
            onClick={handleRetry}
          >
            5초 광고 보고 도전하기
          </Button>
        )}
      </section>

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
