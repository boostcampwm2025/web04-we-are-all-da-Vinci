import { usePlayChance, useRewardAd } from "@/feature/playChance";
import { serverTossApi } from "@/shared/api";
import { getDeviceId } from "@apps-in-toss/web-framework";
import { Button } from "@toss/tds-mobile";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { NOT_SUBMITTED_MESSAGE } from "../config/constants";

const MyRankingNotSubmitted = () => {
  const navigate = useNavigate();
  const { charge, startPlay } = usePlayChance();
  const { isAdLoaded, showAd } = useRewardAd();
  const [isStarting, setIsStarting] = useState(false);

  const handleStart = async () => {
    if (isStarting) return;
    setIsStarting(true);
    try {
      if (isAdLoaded) {
        await showAd();
        try {
          await serverTossApi.recordAdView();
        } catch (err) {
          console.error("[recordAdView 실패, 무시]", err);
        }
      }
      await charge();
      const started = await startPlay();
      if (!started) return;

      let hash: string;
      try {
        const { deviceId } = await getDeviceId();
        hash = deviceId;
      } catch {
        hash = "local";
      }
      const { promptId, strokes } = await serverTossApi.getPrompt();
      navigate("/memorize", {
        state: { promptId, promptStrokes: strokes, anonymousHash: hash },
        replace: true,
      });
    } catch (err) {
      console.error("프롬프트 로드 실패:", err);
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="h-42 flex flex-col items-center justify-center px-(--page-px) text-center">
      <div className="flex flex-col items-center justify-center gap-2">
        <div className="text-(--color-description) text-xs font-normal">
          내 등수
        </div>
        <div className="text-lg font-bold text-[`#031228`]">
          {NOT_SUBMITTED_MESSAGE}
        </div>
        <Button
          size="large"
          variant="weak"
          display="block"
          aria-label="그림 그리러 가기"
          loading={isStarting}
          onClick={handleStart}
        >
          그림 그리러 가기
        </Button>
      </div>
    </div>
  );
};

export default MyRankingNotSubmitted;
