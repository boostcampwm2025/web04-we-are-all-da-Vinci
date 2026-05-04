import {
  loadFullScreenAd,
  showFullScreenAd,
} from "@apps-in-toss/web-framework";
import { Button } from "@toss/tds-mobile";
import { useEffect, useRef, useState } from "react";

interface RewardAdProps {
  adGroupId: string;
  onReward: () => void | Promise<void>;
  text?: string;
}

const RewardAd = ({
  adGroupId,
  onReward,
  text = "광고 보고 기회 충전하기",
}: RewardAdProps) => {
  const [isAdLoaded, setIsAdLoaded] = useState(false);
  const [isRewarding, setIsRewarding] = useState(false);
  const unregisterRef = useRef<(() => void) | null>(null);

  const registerAdLoader = (groupId: string) => {
    unregisterRef.current?.();
    unregisterRef.current = loadFullScreenAd({
      options: { adGroupId: groupId },
      onEvent: (event) => {
        if (event.type === "loaded") setIsAdLoaded(true);
      },
      onError: (error) => console.error("광고 로드에 실패했어요:", error),
    });
  };

  useEffect(() => {
    if (!loadFullScreenAd.isSupported()) {
      console.error("인앱 광고 미지원 환경이에요.");
      return;
    }

    registerAdLoader(adGroupId);

    return () => {
      unregisterRef.current?.();
      unregisterRef.current = null;
    };
  }, [adGroupId]);

  const handleShowAd = () => {
    if (isRewarding) return;

    showFullScreenAd({
      options: { adGroupId },
      onEvent: async (event) => {
        if (event.type === "userEarnedReward") {
          setIsRewarding(true);
          try {
            await onReward();
          } finally {
            setIsRewarding(false);
          }
        }
        if (event.type === "dismissed") {
          setIsAdLoaded(false);
          registerAdLoader(adGroupId);
        }
      },
      onError: (error) => console.error("광고 표시에 실패했어요:", error),
    });
  };

  return (
    <Button
      onClick={handleShowAd}
      disabled={!isAdLoaded || isRewarding}
      color="primary"
      display="block"
      loading={isRewarding}
    >
      {isAdLoaded ? text : "광고 준비 중이에요"}
    </Button>
  );
};

export default RewardAd;
