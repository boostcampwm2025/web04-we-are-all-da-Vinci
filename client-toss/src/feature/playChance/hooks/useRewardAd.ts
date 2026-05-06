import {
  loadFullScreenAd,
  showFullScreenAd,
} from "@apps-in-toss/web-framework";
import { useCallback, useEffect, useRef, useState } from "react";

const AD_GROUP_ID = "ait-ad-test-rewarded-id";
const AD_TIMEOUT_MS = 10_000;

export const useRewardAd = () => {
  const isSupported = loadFullScreenAd.isSupported();
  // 광고 SDK 미지원(로컬 dev 등)에서는 곧바로 "로드 완료" 상태로 간주해 흐름 차단을 막는다.
  const [isAdLoaded, setIsAdLoaded] = useState(!isSupported);
  const adUnregisterRef = useRef<(() => void) | null>(null);

  const registerAdLoader = useCallback(() => {
    adUnregisterRef.current?.();
    if (!isSupported) return;
    adUnregisterRef.current = loadFullScreenAd({
      options: { adGroupId: AD_GROUP_ID },
      onEvent: (event) => {
        if (event.type === "loaded") setIsAdLoaded(true);
      },
      onError: (err) => console.error("[광고 로드 실패]", err),
    });
  }, [isSupported]);

  useEffect(() => {
    registerAdLoader();
    return () => {
      adUnregisterRef.current?.();
      adUnregisterRef.current = null;
    };
  }, [registerAdLoader]);

  const reloadAd = useCallback(() => {
    if (!isSupported) return;
    setIsAdLoaded(false);
    registerAdLoader();
  }, [isSupported, registerAdLoader]);

  const showAd = useCallback(
    () =>
      new Promise<void>((resolve, reject) => {
        if (!isSupported) {
          resolve();
          return;
        }

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
    [isSupported, reloadAd],
  );

  return { isAdLoaded, showAd };
};
