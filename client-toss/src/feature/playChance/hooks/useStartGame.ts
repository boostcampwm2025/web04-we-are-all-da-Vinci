import {
  FUNNEL_EVENTS,
  formatLocalDate,
  getAnonymousHash,
  getErrorMessage,
  trackClick,
} from "@/shared/lib";
import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFullScreenAd } from "./useFullScreenAd";
import { usePlayChanceContext } from "../model/playChanceContext";

type StartResult =
  | { ok: true }
  | { ok: false; reason: "no_prompt" | "error" | "ad_not_ready" };

/**
 * 그리기 도전 시작을 담당하는 단일 플레이 훅. 대시보드 CTA와 하단바 FAB가 공유한다.
 * - `start`: 보유한 기회로 바로 시작 → `startPlay()` → `/memorize` 이동.
 * - `startWithAd`: 광고를 보고 기회를 충전한 뒤 시작(대시보드 "광고 보고 도전하기"와 동일 흐름).
 * 표시용 상태(hasChance·chanceCount·isChanceLoading·adStatus)도 함께 노출해 CTA 라벨을 만든다.
 */
export const useStartGame = () => {
  const navigate = useNavigate();
  const {
    hasChance,
    chanceCount,
    isLoading: isChanceLoading,
    startPlay,
    chargeByAd,
    refresh,
  } = usePlayChanceContext();
  const { adStatus, isAdLoaded, showAd, reloadAd, adGroupId } =
    useFullScreenAd();
  const [isStarting, setIsStarting] = useState(false);

  // isStarting이 이미 true인 상태를 가정하고 실제 시작을 수행한다(start/startWithAd 공용).
  const runStart = useCallback(
    async (source: string): Promise<StartResult> => {
      try {
        const prompt = await startPlay();
        if (!prompt) {
          trackClick(FUNNEL_EVENTS.playStartFailed, {
            source,
            reason: "empty_prompt_response",
          });
          setIsStarting(false);
          return { ok: false, reason: "no_prompt" };
        }

        const hash = await getAnonymousHash();
        // 자동시작 게이트를 닫는다 — 제출 없이 이탈해도 재자동시작/이중차감 방지
        localStorage.setItem(`lastPlayed_${hash}`, formatLocalDate());

        trackClick(FUNNEL_EVENTS.playStartSuccess, {
          source,
          prompt_id: prompt.promptId,
        });
        navigate("/memorize", {
          state: {
            promptId: prompt.promptId,
            promptStrokes: prompt.strokes,
            anonymousHash: hash,
          },
          replace: true,
        });
        return { ok: true };
      } catch (err) {
        trackClick(FUNNEL_EVENTS.playStartFailed, {
          source,
          reason: getErrorMessage(err),
        });
        setIsStarting(false);
        return { ok: false, reason: "error" };
      }
    },
    [navigate, startPlay],
  );

  const start = useCallback(
    async (source: string): Promise<StartResult> => {
      if (isStarting) return { ok: false, reason: "error" };
      setIsStarting(true);
      trackClick(FUNNEL_EVENTS.playStartAttempt, {
        source,
        has_chance: hasChance,
        chance_count: chanceCount,
      });
      return runStart(source);
    },
    [chanceCount, hasChance, isStarting, runStart],
  );

  const startWithAd = useCallback(
    async (source: string): Promise<StartResult> => {
      if (isStarting) return { ok: false, reason: "error" };
      if (!isAdLoaded) {
        reloadAd();
        trackClick(FUNNEL_EVENTS.adRewardFailed, {
          ad_group_id: adGroupId,
          reason: "ad_not_ready",
        });
        return { ok: false, reason: "ad_not_ready" };
      }

      setIsStarting(true);
      trackClick(FUNNEL_EVENTS.playStartAttempt, {
        source,
        has_chance: hasChance,
        chance_count: chanceCount,
      });
      trackClick(FUNNEL_EVENTS.adRewardAttempt, { ad_group_id: adGroupId });
      try {
        await showAd();
        const count = await chargeByAd({ adGroupId });
        trackClick(FUNNEL_EVENTS.adRewardSuccess, {
          ad_group_id: adGroupId,
          chance_count: count,
        });
      } catch (err) {
        trackClick(FUNNEL_EVENTS.adRewardFailed, {
          ad_group_id: adGroupId,
          reason: getErrorMessage(err),
        });
        setIsStarting(false);
        return { ok: false, reason: "error" };
      }

      const result = await runStart(source);
      // 충전했는데 프롬프트가 비면 기회 상태를 다시 맞춘다.
      if (!result.ok && result.reason === "no_prompt") {
        await refresh();
      }
      return result;
    },
    [
      adGroupId,
      chanceCount,
      chargeByAd,
      hasChance,
      isAdLoaded,
      isStarting,
      refresh,
      reloadAd,
      runStart,
      showAd,
    ],
  );

  return {
    start,
    startWithAd,
    reloadAd,
    isStarting,
    hasChance,
    chanceCount,
    isChanceLoading,
    adStatus,
  };
};
