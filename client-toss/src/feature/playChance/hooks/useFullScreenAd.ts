import { AD_GROUP_IDS } from "@/shared/config";
import {
  loadFullScreenAd,
  showFullScreenAd,
} from "@apps-in-toss/web-framework";
import { useCallback, useEffect, useRef, useState } from "react";
import { AD_LOAD_TIMEOUT_MS } from "../config/constants";

/** 전면 광고 로드 상태 — loading: 로드 중, ready: 노출 가능, failed: 로드 실패/타임아웃. */
export type AdStatus = "loading" | "ready" | "failed";

/** 보상형 광고에서 토스가 내려주는 리워드 정보(userEarnedReward 이벤트). */
export interface AdRewardData {
  unitType?: string;
  unitAmount?: number;
}

interface UseFullScreenAdOptions {
  /**
   * true면 보상형(rewarded) 광고로 취급한다.
   * 앱인토스 문서 기준 보상은 `userEarnedReward` 이벤트에서만 인정되므로,
   * showAd가 해당 이벤트가 발생한 경우에만 resolve(리워드 데이터)하고 그 외엔 reject한다.
   * false(기본)면 기존 흐름대로 impression 후 dismissed에서 resolve한다.
   */
  rewarded?: boolean;
}

/**
 * 전면/보상형 광고 로드·노출 훅.
 * @param adGroupId 노출할 광고 그룹 ID (기본: 플레이 전면 광고)
 */
export const useFullScreenAd = (
  adGroupId: string = AD_GROUP_IDS.FULLSCREEN,
  { rewarded = false }: UseFullScreenAdOptions = {},
) => {
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
      options: { adGroupId },
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
  }, [adGroupId, clearLoadTimeout, isSupported]);

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
      new Promise<AdRewardData | undefined>((resolve, reject) => {
        if (!isSupported) {
          resolve(undefined);
          return;
        }

        let wasShown = false;
        let reward: AdRewardData | undefined;
        let done = false;

        showFullScreenAd({
          options: { adGroupId },
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
            // 보상형: 사용자가 시청을 완료해 리워드를 획득한 시점. 이 데이터로만 보상 인정.
            if (event.type === "userEarnedReward") reward = event.data;
            if (event.type === "dismissed") {
              if (done) return;
              done = true;
              reloadAd();
              // 보상형은 userEarnedReward가 있어야만 성공으로 인정한다.
              if (rewarded) {
                if (reward) resolve(reward);
                else reject(new Error("reward_not_earned"));
                return;
              }
              if (wasShown) resolve(undefined);
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
    [adGroupId, isSupported, reloadAd, rewarded],
  );

  return {
    adStatus,
    isAdLoaded: adStatus === "ready",
    showAd,
    reloadAd,
    adGroupId,
  };
};
