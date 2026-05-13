import { AD_GROUP_IDS } from "@/shared/config";
import {
  loadFullScreenAd,
  showFullScreenAd,
} from "@apps-in-toss/web-framework";
import { useCallback, useEffect, useRef, useState } from "react";

const FULL_SCREEN_AD_GROUP_ID = AD_GROUP_IDS.FULLSCREEN;

export const useFullScreenAd = () => {
  const isSupported = loadFullScreenAd.isSupported();
  // 광고 SDK 미지원(로컬 dev 등)에서는 곧바로 "로드 완료" 상태로 간주해 흐름 차단을 막는다.
  const [isAdLoaded, setIsAdLoaded] = useState(!isSupported);
  const adUnregisterRef = useRef<(() => void) | null>(null);

  const registerAdLoader = useCallback(() => {
    adUnregisterRef.current?.();
    if (!isSupported) return;
    adUnregisterRef.current = loadFullScreenAd({
      options: { adGroupId: FULL_SCREEN_AD_GROUP_ID },
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

        let wasShown = false;
        let done = false;

        showFullScreenAd({
          options: { adGroupId: FULL_SCREEN_AD_GROUP_ID },
          onEvent: (event) => {
            if (event.type === "failedToShow") {
              if (done) return;
              done = true;
              reloadAd();
              reject(new Error("failedToShow"));
              return;
            }
            // 광고가 실제 화면에 렌더링된 시점(수익 발생 시점). impression 없이 종료된 경우 충전 트리거하지 않는다.
            if (event.type === "impression") wasShown = true;
            if (event.type === "dismissed") {
              if (done) return;
              done = true;
              reloadAd();
              if (wasShown) resolve();
              else reject(new Error("closed"));
            }
          },
          onError: (err) => {
            if (done) return;
            done = true;
            reloadAd();
            reject(err);
          },
        });
      }),
    [isSupported, reloadAd],
  );

  return { isAdLoaded, showAd, adGroupId: FULL_SCREEN_AD_GROUP_ID };
};
