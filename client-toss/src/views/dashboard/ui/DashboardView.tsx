import { MyScoreCard, useMyDrawings } from "@/entities/myScoreCard";
import { Podium } from "@/entities/podium";
import { usePlayChance, useRewardAd } from "@/feature/playChance";
import {
  getCachedNickname,
  serverTossApi,
  setCachedNickname,
} from "@/shared/api";
import { AD_GROUP_IDS } from "@/shared/config";
import { formatLocalDate, trackClick, useExitGuard } from "@/shared/lib";
import { BannerAd } from "@/shared/ui/bannerAd";
import { getDeviceId } from "@apps-in-toss/web-framework";
import { colors } from "@toss/tds-colors";
import {
  Button,
  ConfirmDialog,
  TextButton,
  Toast,
  Top,
} from "@toss/tds-mobile";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

const DashboardView = () => {
  const navigate = useNavigate();
  const { state: locationState } = useLocation();
  const { showDialog, setShowDialog, exit } = useExitGuard();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastText, setToastText] = useState("일시적 오류가 발생했어요");
  const sliderRef = useRef<HTMLDivElement>(null);
  const myResultRef = useRef<HTMLDivElement>(null);
  const anonymousHashRef = useRef<string>("local");
  const { myDrawings, isLoading, refetch: refetchDrawings } = useMyDrawings();
  const {
    hasChance,
    isLoading: isChanceLoading,
    charge,
    startPlay,
  } = usePlayChance();
  const { isAdLoaded, showAd } = useRewardAd();
  const cardCount = Math.max(myDrawings.length, 1);

  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nickname, setNickname] = useState<string>(
    () => getCachedNickname() ?? "",
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
      let hash: string;
      try {
        const { deviceId } = await getDeviceId();
        hash = deviceId;
      } catch {
        hash = "local";
      }
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
            promotionGranted ? "포인트 지급이 완료됐어요" : "그림이 저장됐어요",
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

  // fromSubmitted일 때 나의 결과 영역으로 자동 스크롤
  useEffect(() => {
    const fromSubmitted = (locationState as { fromSubmitted?: boolean })
      ?.fromSubmitted;
    if (!fromSubmitted || isLoading || !myResultRef.current) return;

    myResultRef.current.scrollIntoView({ behavior: "smooth" });
  }, [locationState, isLoading]);

  const recordAdViewBestEffort = async () => {
    try {
      await serverTossApi.recordAdView();
    } catch (err) {
      console.error("[recordAdView 실패, 무시]", err);
    }
  };

  const handleRetry = async () => {
    if (isStartingGame) return;
    setIsStartingGame(true);
    try {
      if (isAdLoaded) {
        await showAd();
        await recordAdViewBestEffort();
      }
      await charge();
      const started = await startPlay();
      if (!started) return;

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

  const handleScroll = () => {
    const slider = sliderRef.current;
    if (!slider) return;
    const index = Math.round(slider.scrollLeft / slider.clientWidth);
    setActiveIndex(Math.min(index, cardCount - 1));
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
    <div
      data-no-safe-area-bottom
      className="min-h-0 flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]"
    >
      <Toast
        position="top"
        open={toastOpen}
        text={toastText}
        leftAddon={<Toast.Icon name="icon-check-circle-blue-opacity" />}
        duration={3000}
        onClose={() => setToastOpen(false)}
      />
      {/* 랭킹 영역 */}
      <div>
        <Top
          title={<Top.TitleParagraph>오늘의 다빈치</Top.TitleParagraph>}
          subtitleBottom={
            <Top.SubtitleParagraph>명예의 전당</Top.SubtitleParagraph>
          }
        />
        <div className="flex w-full flex-col items-center gap-4 px-(--page-px)">
          {/* 랭킹 TOP3 */}
          <Podium />
          <Link
            to="/ranking"
            onClick={() => trackClick("dashboard_to_ranking_click")}
          >
            <TextButton size="small" variant="arrow">
              TOP 100 랭킹 보러가기
            </TextButton>
          </Link>
        </div>
      </div>

      {/* 나의 결과 영역 */}
      <div ref={myResultRef}>
        <Top
          title={
            <Top.TitleParagraph>
              {nickname ? `${nickname}의 결과` : "오늘 나의 결과"}
            </Top.TitleParagraph>
          }
        />
      </div>

      {/* 인디케이터 */}
      <div className="flex justify-center gap-2 py-4">
        {Array.from({ length: cardCount }).map((_, i) => (
          <div
            key={i}
            className="h-2 w-2 rounded-full transition-colors duration-200"
            style={{
              backgroundColor:
                i === activeIndex ? colors.blue500 : colors.grey100,
            }}
          />
        ))}
      </div>
      {/* 슬라이드할 부분 */}
      <div
        ref={sliderRef}
        className="flex snap-x snap-mandatory overflow-x-scroll"
        style={{ scrollbarWidth: "none" }}
        onScroll={handleScroll}
      >
        {isLoading ? (
          <div className="w-full shrink-0 snap-start snap-always px-(--page-px)">
            <div
              className="h-96 w-full rounded-2xl"
              style={{ backgroundColor: colors.grey100 }}
            />
          </div>
        ) : myDrawings.length > 0 ? (
          myDrawings.map((drawing) => (
            <div
              key={drawing.drawingId}
              className="w-full shrink-0 snap-start snap-always"
            >
              <MyScoreCard drawing={drawing} />
            </div>
          ))
        ) : (
          <div className="w-full shrink-0 snap-start snap-always px-(--page-px)">
            <div
              className="flex h-44 w-full items-center justify-center rounded-2xl text-sm"
              style={{
                backgroundColor: colors.grey100,
                color: colors.grey600,
              }}
            >
              아직 제출한 그림이 없어요
            </div>
          </div>
        )}
      </div>

      <BannerAd adGroupId={AD_GROUP_IDS.BANNER_LIST} className="mt-3 mb-3" />

      {/* 하단 버튼 */}
      <div className="flex flex-col gap-3 px-(--page-px)">
        {isChanceLoading ? (
          <Button color="primary" display="block" loading disabled>
            플레이 기회 확인 중
          </Button>
        ) : hasChance ? (
          <Button
            color="primary"
            display="block"
            loading={isStartingGame}
            disabled={isStartingGame}
            onClick={startGame}
          >
            플레이하기
          </Button>
        ) : (
          <Button
            color="primary"
            display="block"
            loading={isStartingGame}
            disabled={isStartingGame}
            onClick={handleRetry}
          >
            다시 도전하기
          </Button>
        )}
      </div>

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
