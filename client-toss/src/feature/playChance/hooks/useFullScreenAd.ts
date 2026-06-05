import { AD_GROUP_IDS } from "@/shared/config";
import {
  loadFullScreenAd,
  showFullScreenAd,
} from "@apps-in-toss/web-framework";
import { useCallback, useEffect, useRef, useState } from "react";
import { AD_LOAD_TIMEOUT_MS } from "../config/constants";

const FULL_SCREEN_AD_GROUP_ID = AD_GROUP_IDS.FULLSCREEN;

/** 전면 광고 로드 상태 — loading: 로드 중, ready: 노출 가능, failed: 로드 실패/타임아웃. */
export type AdStatus = "loading" | "ready" | "failed";

export const useFullScreenAd = () => {
  const isSupported = loadFullScreenAd.isSupported();
  // 광고 SDK 미지원(로컬 dev 등)에서는 곧바로 "ready"로 간주해 흐름 차단을 막는다.
  const [adStatus, setAdStatus] = useState<AdStatus>(
    isSupported ? "loading" : "ready",
  );
  const adUnregisterRef = useRef<(() => void) | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearLoadTimeout = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const registerAdLoader = useCallback(() => {
    adUnregisterRef.current?.();
    clearLoadTimeout();
    if (!isSupported) return;
    // 일정 시간 내 loaded 이벤트가 없으면 실패로 간주 — 버튼이 영구 로딩에 갇히는 것을 막는다.
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      setAdStatus("failed");
    }, AD_LOAD_TIMEOUT_MS);
    adUnregisterRef.current = loadFullScreenAd({
      options: { adGroupId: FULL_SCREEN_AD_GROUP_ID },
      onEvent: (event) => {
        if (event.type === "loaded") {
          clearLoadTimeout();
          setAdStatus("ready");
        }
      },
      onError: (err) => {
        console.error("[광고 로드 실패]", err);
        clearLoadTimeout();
        setAdStatus("failed");
      },
    });
  }, [clearLoadTimeout, isSupported]);

  useEffect(() => {
    registerAdLoader();
    return () => {
      adUnregisterRef.current?.();
      adUnregisterRef.current = null;
      clearLoadTimeout();
    };
  }, [clearLoadTimeout, registerAdLoader]);

  const reloadAd = useCallback(() => {
    if (!isSupported) return;
    setAdStatus("loading");
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

  return {
    adStatus,
    isAdLoaded: adStatus === "ready",
    showAd,
    reloadAd,
    adGroupId: FULL_SCREEN_AD_GROUP_ID,
  };
};
