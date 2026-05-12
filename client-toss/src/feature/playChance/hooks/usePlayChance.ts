import { RequestError, serverTossApi } from "@/shared/api";
import type {
  AdSdkPayload,
  PromptResponse,
  ShareSdkPayload,
} from "@toss/shared";
import { useCallback, useEffect, useState } from "react";
import {
  clearPlaySession,
  startPlaySession,
} from "../model/playSessionStorage";

interface PlayChanceHookState {
  count: number;
  isLoading: boolean;
  error: Error | null;
}

const toError = (unknownError: unknown, fallbackMessage: string): Error =>
  unknownError instanceof Error ? unknownError : new Error(fallbackMessage);

export const usePlayChance = () => {
  const [state, setState] = useState<PlayChanceHookState>({
    count: 0,
    isLoading: true,
    error: null,
  });

  const refresh = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const { count } = await serverTossApi.getMyChance();
      setState({ count, isLoading: false, error: null });
      return count;
    } catch (unknownError) {
      const error = toError(unknownError, "그리기 기회를 불러오지 못했어요.");
      setState((prev) => ({ ...prev, isLoading: false, error }));
      throw error;
    }
  }, []);

  const chargeByAd = useCallback(async (sdkPayload: AdSdkPayload) => {
    const { count } = await serverTossApi.chargeChanceByAd(sdkPayload);
    setState((prev) => ({ ...prev, count, error: null }));
    return count;
  }, []);

  const chargeByShare = useCallback(async (sdkPayload: ShareSdkPayload) => {
    const { count } = await serverTossApi.chargeChanceByShare(sdkPayload);
    setState((prev) => ({ ...prev, count, error: null }));
    return count;
  }, []);

  const consume = useCallback(async () => {
    try {
      const { count } = await serverTossApi.consumeChance();
      setState((prev) => ({ ...prev, count, error: null }));
      return true;
    } catch (unknownError) {
      // 409만 "기회 부족"으로 false 처리. 그 외는 장애로 보고 throw해 호출자가 구분 가능하게 함
      if (unknownError instanceof RequestError && unknownError.status === 409) {
        return false;
      }
      const error = toError(unknownError, "그리기 기회 차감에 실패했어요.");
      setState((prev) => ({ ...prev, error }));
      throw error;
    }
  }, []);

  const startPlay = useCallback(async (): Promise<PromptResponse | null> => {
    // localStorage 세션 기록을 먼저, 성공 시에만 서버 차감 — 실패 시 chance가 손실되지 않게 순서를 뒤집음
    try {
      await startPlaySession();
    } catch (unknownError) {
      const error = toError(unknownError, "플레이 세션을 저장하지 못했어요.");
      setState((prev) => ({ ...prev, error }));
      return null;
    }
    try {
      const prompt = await serverTossApi.startPlay();
      setState((prev) => ({
        ...prev,
        count: Math.max(prev.count - 1, 0),
        error: null,
      }));
      return prompt;
    } catch (unknownError) {
      await clearPlaySession().catch(() => {});
      if (unknownError instanceof RequestError && unknownError.status === 409) {
        return null;
      }
      const error = toError(unknownError, "게임 시작에 실패했어요");
      setState((prev) => ({ ...prev, error }));
      throw error;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    serverTossApi
      .getMyChance()
      .then(({ count }) => {
        if (!isMounted) return;
        setState({ count, isLoading: false, error: null });
      })
      .catch((unknownError: unknown) => {
        if (!isMounted) return;
        setState({
          count: 0,
          isLoading: false,
          error: toError(unknownError, "그리기 기회를 불러오지 못했어요."),
        });
      });
    return () => {
      isMounted = false;
    };
  }, []);

  return {
    chanceCount: state.count,
    hasChance: state.count > 0,
    isLoading: state.isLoading,
    error: state.error,
    refresh,
    chargeByAd,
    chargeByShare,
    consume,
    startPlay,
  };
};
