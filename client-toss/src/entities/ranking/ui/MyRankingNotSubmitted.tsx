import type { PlayChanceLayoutContext } from "@/app/layouts/PlayChanceLayout";
import { useRewardAd } from "@/feature/playChance";
import { AD_GROUP_IDS } from "@/shared/config";
import { getAnonymousHash } from "@/shared/lib";
import { Button, Toast } from "@toss/tds-mobile";
import { useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { NOT_SUBMITTED_MESSAGE } from "../config/constants";

const MyRankingNotSubmitted = () => {
  const navigate = useNavigate();
  const { chanceCount, hasChance, chargeByAd, startPlay } =
    useOutletContext<PlayChanceLayoutContext>();
  const { isAdLoaded, showAd } = useRewardAd();
  const [isStarting, setIsStarting] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastText, setToastText] = useState("");

  const showToast = (message: string) => {
    setToastText(message);
    setToastOpen(true);
  };

  const handleStart = async () => {
    if (isStarting) return;
    setIsStarting(true);
    try {
      if (isAdLoaded && !hasChance) {
        await showAd();
        await chargeByAd({ adGroupId: AD_GROUP_IDS.REWARDED });
      }
      const prompt = await startPlay();
      if (!prompt) {
        showToast("그리기 기회가 부족해요. 잠시 후 다시 시도해주세요.");
        return;
      }

      const hash = await getAnonymousHash();
      navigate("/memorize", {
        state: {
          promptId: prompt.promptId,
          promptStrokes: prompt.strokes,
          anonymousHash: hash,
        },
        replace: true,
      });
    } catch (err) {
      console.error("프롬프트 로드 실패:", err);
      showToast("일시적 오류가 발생했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="h-42 flex flex-col items-center justify-center px-(--page-px) text-center">
      <Toast
        position="top"
        open={toastOpen}
        text={toastText}
        duration={2500}
        onClose={() => setToastOpen(false)}
      />
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
          aria-label="그림 그리러 가요"
          loading={isStarting}
          onClick={handleStart}
        >
          {hasChance
            ? `광고 없이 ${chanceCount}번 도전해요`
            : "그림 그리러 가요"}
        </Button>
      </div>
    </div>
  );
};

export default MyRankingNotSubmitted;
