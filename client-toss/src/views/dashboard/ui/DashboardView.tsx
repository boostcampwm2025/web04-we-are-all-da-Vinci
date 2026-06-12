import {
  NotificationCenterSheet,
  useNotificationAutoPrompt,
} from "@/feature/notification";
import { useStartGame } from "@/feature/playChance";
import { useToast } from "@/shared/lib";
import { ExitDialog } from "@/shared/ui/exitDialog";
import { Button, Toast } from "@toss/tds-mobile";
import { useState } from "react";
import { useLocation } from "react-router-dom";
import { useDailyAutoStart } from "../model/useDailyAutoStart";
import ChallengeCard from "./ChallengeCard";
import PlayCtaButton from "./PlayCtaButton";
import StreakStatsCard from "./StreakStatsCard";
import TodayDavinciCard from "./TodayDavinciCard";
import TodayMissionCard from "./TodayMissionCard";

const DashboardView = () => {
  const { state: locationState } = useLocation();
  const toast = useToast();
  const [error, setError] = useState<string | null>(null);

  const play = useStartGame();

  // 기회로 시작 + 실패 시 전체화면 에러 노출. 자동시작·CTA·재시도가 공유한다.
  const runPlay = async (source: string) => {
    setError(null);
    const result = await play.start(source);
    if (!result.ok && result.reason === "error") {
      setError("서버 응답이 늦어지고 있어요. 다시 시도해주세요.");
    }
    return result;
  };
  const handleStart = () => runPlay("cta");

  const { initialLoading, playedToday } = useDailyAutoStart({
    start: runPlay,
    showToast: toast.show,
    locationState,
  });
  const notificationAutoPrompt = useNotificationAutoPrompt(playedToday);

  const handleAdStart = async () => {
    const result = await play.startWithAd("retry");
    if (result.ok) return;
    if (result.reason === "no_prompt") {
      toast.show("그리기 기회를 다시 확인했어요. 잠시 후 다시 시도해주세요.");
    } else if (result.reason === "error") {
      toast.show("일시적 오류가 발생했어요");
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
        <Button size="large" onClick={handleStart}>
          다시 시도해요
        </Button>
      </div>
    );
  }

  const cta = (
    <PlayCtaButton
      isChanceLoading={play.isChanceLoading}
      hasChance={play.hasChance}
      chanceCount={play.chanceCount}
      adStatus={play.adStatus}
      isStarting={play.isStarting}
      onStart={handleStart}
      onAdStart={handleAdStart}
      onReloadAd={play.reloadAd}
    />
  );

  return (
    <div
      data-no-safe-area-bottom
      className="flex h-full flex-col bg-(--color-page)"
    >
      <Toast
        position="top"
        open={toast.open}
        text={toast.text}
        leftAddon={<Toast.Icon name="icon-check-circle-blue-opacity" />}
        duration={3000}
        onClose={toast.close}
      />

      <main className="min-h-0 flex-1 overflow-y-auto px-(--page-px) pt-3 pb-[calc(env(safe-area-inset-bottom)+72px)]">
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

      <ExitDialog
        title="우리 모두 다빈치를 종료할까요?"
        confirmLabel="종료하기"
        cancelLabel="계속 둘러보기"
      />
    </div>
  );
};

export default DashboardView;
