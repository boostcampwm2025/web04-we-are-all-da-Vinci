import { useAttendanceStatus } from "@/entities/attendance";
import { useTodayMissions } from "@/entities/missionCard";
import { usePodium } from "@/entities/podium";
import { usePointSummary } from "@/entities/point";
import {
  NotificationCenterSheet,
  useNotificationAutoPrompt,
} from "@/feature/notification";
import { useStartGame } from "@/feature/playChance";
import { AD_GROUP_IDS } from "@/shared/config";
import { useToast } from "@/shared/lib";
import { BannerAd } from "@/shared/ui/bannerAd";
import { ExitDialog } from "@/shared/ui/exitDialog";
import { Button, Toast } from "@toss/tds-mobile";
import { useCallback, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAttendanceAutoCheckIn } from "../model/useAttendanceAutoCheckIn";
import { useDailyAutoStart } from "../model/useDailyAutoStart";
import AttendanceResultSheet from "./AttendanceResultSheet";
import ChallengeCard from "./ChallengeCard";
import PlayCtaButton from "./PlayCtaButton";
import StreakStatsCard from "./StreakStatsCard";
import TodayDavinciCard from "./TodayDavinciCard";
import TodayMissionCard from "./TodayMissionCard";

const DashboardView = () => {
  const { state: locationState } = useLocation();
  const {
    open: toastOpen,
    text: toastText,
    show: showToast,
    close: closeToast,
  } = useToast();
  const [error, setError] = useState<string | null>(null);

  const {
    start,
    startWithAd,
    reloadAd,
    isChanceLoading,
    hasChance,
    chanceCount,
    adStatus,
    isStarting,
  } = useStartGame();

  const runPlay = useCallback(
    async (source: string) => {
      setError(null);
      const result = await start(source);
      if (!result.ok && result.reason === "error") {
        setError("서버 응답이 늦어지고 있어요. 다시 시도해주세요.");
      }
      return result;
    },
    [start],
  );
  const handleStart = useCallback(() => runPlay("cta"), [runPlay]);

  const { initialLoading, playedToday } = useDailyAutoStart({
    start: runPlay,
    showToast,
    locationState,
  });

  const { status: attendanceStatus, refetch: refetchAttendance } =
    useAttendanceStatus();
  // 포인트는 출석과 분리된 리소스(/points/me). 포인트 변동 시 함께 재조회한다.
  const { summary: pointSummary, refetch: refetchPoints } = usePointSummary();
  // 출석 체크인·복구로 포인트(마일스톤)가 바뀔 수 있으므로 현황+포인트를 같이 갱신.
  const refreshAttendance = useCallback(() => {
    refetchAttendance();
    refetchPoints();
  }, [refetchAttendance, refetchPoints]);

  // 게임 자동시작으로 넘어가지 않고 대시보드가 실제 보일 때(playedToday)만 출석 체크인·시트.
  const attendanceCheckIn = useAttendanceAutoCheckIn({
    enabled: playedToday,
    onChecked: refreshAttendance,
  });

  // 알림 시트는 출석 시트와 겹치지 않도록 출석 처리가 끝나고(settled) 출석 시트가 닫힌 뒤에만 띄운다.
  const notificationAutoPrompt = useNotificationAutoPrompt(
    playedToday &&
      attendanceCheckIn.settled &&
      attendanceCheckIn.result === null,
  );

  const { missions: todayMissions, isLoading: isMissionsLoading } =
    useTodayMissions();
  const missionMaxPoint = todayMissions.reduce(
    (sum, mission) => sum + mission.rewardAmount,
    0,
  );

  // 시상대는 ChallengeCard(최고점·참가자수)와 TodayDavinciCard(top3)가 함께 쓴다.
  // useAbortableQuery에 dedupe가 없어 각 카드가 호출하면 GET /podium이 2번 나가므로
  // 뷰에서 1회만 호출해 props로 내려준다.
  const { podium, participantCount } = usePodium();

  const handleAdStart = useCallback(async () => {
    const result = await startWithAd("retry");
    if (result.ok) return;
    if (result.reason === "no_prompt") {
      showToast("그리기 기회를 다시 확인했어요. 잠시 후 다시 시도해주세요.");
    } else if (result.reason === "error") {
      showToast("일시적 오류가 발생했어요");
    }
  }, [startWithAd, showToast]);

  // cta를 useMemo로 — play 상태가 바뀔 때만 새 참조가 되어, 그 외 최상위 state
  // 변화(attendance·missions·podium 해소)에는 ChallengeCard가 리렌더되지 않는다.
  // (hook이므로 아래 early return보다 위에 있어야 함 — rules of hooks)
  const cta = useMemo(
    () => (
      <PlayCtaButton
        isChanceLoading={isChanceLoading}
        hasChance={hasChance}
        chanceCount={chanceCount}
        adStatus={adStatus}
        isStarting={isStarting}
        onStart={handleStart}
        onAdStart={handleAdStart}
        onReloadAd={reloadAd}
      />
    ),
    [
      isChanceLoading,
      hasChance,
      chanceCount,
      adStatus,
      isStarting,
      reloadAd,
      handleStart,
      handleAdStart,
    ],
  );

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
        <Button size="large" onClick={handleStart}>
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
        onClose={closeToast}
      />

      <main className="min-h-0 flex-1 overflow-y-auto px-(--page-px) pt-3 pb-[calc(env(safe-area-inset-bottom)+72px)]">
        <div className="flex flex-col gap-3">
          <StreakStatsCard
            status={attendanceStatus ?? undefined}
            pointSummary={pointSummary ?? undefined}
            missionMaxPoint={missionMaxPoint}
          />
          <ChallengeCard
            cta={cta}
            podium={podium}
            participantCount={participantCount}
          />
          <TodayMissionCard
            missions={todayMissions}
            isLoading={isMissionsLoading}
          />
          <TodayDavinciCard podium={podium} />
        </div>

        <div className="-mx-(--page-px) px-(--card-mx)">
          <BannerAd type="feed" adGroupId={AD_GROUP_IDS.BANNER_FEED} />
        </div>
      </main>

      <AttendanceResultSheet
        result={attendanceCheckIn.result}
        onClose={attendanceCheckIn.close}
        onRecovered={refreshAttendance}
      />

      <NotificationCenterSheet
        open={notificationAutoPrompt.open}
        onClose={notificationAutoPrompt.close}
      />

      <ExitDialog
        title="우리 모두 다빈치를 종료할까요?"
        confirmLabel="종료하기"
        cancelLabel="계속 둘러보기"
      />
    </div>
  );
};

export default DashboardView;
