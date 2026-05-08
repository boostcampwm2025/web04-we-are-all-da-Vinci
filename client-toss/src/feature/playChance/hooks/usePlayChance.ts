import type { AdSdkPayload, ShareSdkPayload } from "@toss/shared";
import { useCallback, useEffect, useState } from "react";
import { serverTossApi } from "@/shared/api";
import { startPlaySession } from "../model/playSessionStorage";

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
    } catch {
      // 409면 false 반환 (count 부족) — 호출자가 안내
      return false;
    }
  }, []);

  const startPlay = useCallback(async () => {
    const consumed = await consume();
    if (!consumed) return false;
    await startPlaySession();
    return true;
  }, [consume]);

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
