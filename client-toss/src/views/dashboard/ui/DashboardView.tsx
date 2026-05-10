import type { PlayChanceLayoutContext } from "@/app/layouts/PlayChanceLayout";
import { useMyDrawings } from "@/entities/myScoreCard";
import { useRewardAd } from "@/feature/playChance";
import {
  getCachedNickname,
  serverTossApi,
  setCachedNickname,
} from "@/shared/api";
import { AD_GROUP_IDS } from "@/shared/config";
import { formatLocalDate, getAnonymousHash, useExitGuard } from "@/shared/lib";
import { Border, Button, ConfirmDialog, Tab, Toast } from "@toss/tds-mobile";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Outlet,
  useLocation,
  useNavigate,
  useOutletContext,
} from "react-router-dom";

const RANKING_PATH = "/ranking";

const DashboardView = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state: locationState } = location;
  const { showDialog, setShowDialog, exit } = useExitGuard();
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastText, setToastText] = useState("일시적 오류가 발생했어요");
  const anonymousHashRef = useRef<string>("local");
  const { myDrawings, isLoading, refetch: refetchDrawings } = useMyDrawings();
  const {
    chanceCount,
    hasChance,
    isLoading: isChanceLoading,
    chargeByAd,
    startPlay,
    refresh: refreshChance,
  } = useOutletContext<PlayChanceLayoutContext>();
  const { isAdLoaded, showAd } = useRewardAd();

  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nickname, setNickname] = useState<string>(
    () => getCachedNickname() ?? "",
  );

  const selectedTab = location.pathname === RANKING_PATH ? 1 : 0;

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

  const startGame = useCallback(async () => {
    if (isStartingGame) return;
    setIsStartingGame(true);
    setError(null);
    try {
      const started = await startPlay();
      if (!started) {
        setIsStartingGame(false);
        return;
      }

      const { promptId, strokes } = await serverTossApi.getPrompt();
      navigate("/memorize", {
        state: {
          promptId,
          promptStrokes: strokes,
          anonymousHash: anonymousHashRef.current,
        },
        replace: true,
      });
    } catch (err) {
      console.error("프롬프트 로드 실패:", err);
      setError("서버 응답이 늦어지고 있어요. 다시 시도해주세요.");
      setIsStartingGame(false);
    }
  }, [navigate, startPlay, isStartingGame]);

  useEffect(() => {
    const fromSubmitted = (locationState as { fromSubmitted?: boolean })
      ?.fromSubmitted;

    const init = async () => {
      const hash = await getAnonymousHash();
      anonymousHashRef.current = hash;

      if (fromSubmitted) {
        // state를 즉시 제거하여 재마운트 시 토스트 재표시 방지
        window.history.replaceState({}, "");

        localStorage.setItem(`lastPlayed_${hash}`, formatLocalDate());
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

      // 첫 방문: initialLoading=true 상태로 게임 시작 (로딩 화면 유지)
      try {
        await startGame();
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
    try {
      if (isAdLoaded) {
        await showAd();
        await chargeByAd({ adGroupId: AD_GROUP_IDS.REWARDED });
      }
      const started = await startPlay();
      if (!started) {
        await refreshChance();
        return;
      }

      const { promptId, strokes } = await serverTossApi.getPrompt();
      navigate("/memorize", {
        state: {
          promptId,
          promptStrokes: strokes,
          anonymousHash: anonymousHashRef.current,
        },
        replace: true,
      });
    } catch (err) {
      console.error("[handleRetry 실패]", err);
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
        <Button size="large" onClick={startGame}>
          다시 시도해요
        </Button>
      </div>
    );
  }

  return (
    <div data-no-safe-area-bottom className="flex h-full flex-col bg-white">
      <Toast
        position="top"
        open={toastOpen}
        text={toastText}
        leftAddon={<Toast.Icon name="icon-check-circle-blue-opacity" />}
        duration={3000}
        onClose={() => setToastOpen(false)}
      />

      <div className="shrink-0 bg-white">
        <Tab onChange={(index) => navigate(index === 1 ? RANKING_PATH : "/")}>
          <Tab.Item selected={selectedTab === 0}>오늘 그린 그림</Tab.Item>
          <Tab.Item selected={selectedTab === 1}>오늘의 다빈치</Tab.Item>
        </Tab>
        <Border variant="full" />
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

      <section className="shrink-0 bg-white px-(--page-px) pt-3 pb-[env(safe-area-inset-bottom)]">
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
            onClick={startGame}
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
            광고 보고 도전하기
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
