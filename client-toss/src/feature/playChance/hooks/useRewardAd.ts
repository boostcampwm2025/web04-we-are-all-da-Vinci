import {
  loadFullScreenAd,
  showFullScreenAd,
} from "@apps-in-toss/web-framework";
import { useCallback, useEffect, useRef, useState } from "react";

const AD_GROUP_ID = "ait-ad-test-rewarded-id";
const AD_TIMEOUT_MS = 10_000;

export const useRewardAd = () => {
  const [isAdLoaded, setIsAdLoaded] = useState(false);
  const adUnregisterRef = useRef<(() => void) | null>(null);

  const registerAdLoader = useCallback(() => {
    adUnregisterRef.current?.();
    if (!loadFullScreenAd.isSupported()) return;
    adUnregisterRef.current = loadFullScreenAd({
      options: { adGroupId: AD_GROUP_ID },
      onEvent: (event) => {
        if (event.type === "loaded") setIsAdLoaded(true);
      },
      onError: (err) => console.error("[광고 로드 실패]", err),
    });
  }, []);

  useEffect(() => {
    registerAdLoader();
    return () => {
      adUnregisterRef.current?.();
      adUnregisterRef.current = null;
    };
  }, [registerAdLoader]);

  const reloadAd = useCallback(() => {
    setIsAdLoaded(false);
    registerAdLoader();
  }, [registerAdLoader]);

  const showAd = useCallback(
    () =>
      new Promise<void>((resolve, reject) => {
        let rewarded = false;
        let done = false;

        const timer = setTimeout(() => {
          if (done) return;
          done = true;
          reloadAd();
          reject(new Error("timeout"));
        }, AD_TIMEOUT_MS);

        showFullScreenAd({
          options: { adGroupId: AD_GROUP_ID },
          onEvent: (event) => {
            if (event.type === "userEarnedReward") rewarded = true;
            if (event.type === "dismissed") {
              if (done) return;
              done = true;
              clearTimeout(timer);
              reloadAd();
              if (rewarded) resolve();
              else reject(new Error("closed"));
            }
          },
          onError: (err) => {
            if (done) return;
            done = true;
            clearTimeout(timer);
            reloadAd();
            reject(err);
          },
        });
      }),
    [reloadAd],
  );

  return { isAdLoaded, showAd };
};
