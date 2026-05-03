import { useCallback, useEffect, useState } from "react";
import {
  chargePlayChance,
  consumePlayChance,
  loadPlayChance,
  type PlayChanceState,
} from "../model/playChanceStorage";

export const usePlayChance = () => {
  const [state, setState] = useState<PlayChanceState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const nextState = await loadPlayChance();
      setState(nextState);
      return nextState;
    } catch (unknownError) {
      const nextError =
        unknownError instanceof Error
          ? unknownError
          : new Error("플레이 기회를 불러오지 못했어요.");
      setError(nextError);
      throw nextError;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const charge = useCallback(async () => {
    const nextState = await chargePlayChance();
    setState(nextState);
    return nextState;
  }, []);

  const consume = useCallback(async () => {
    const result = await consumePlayChance();
    setState(result.state);
    return result.consumed;
  }, []);

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);
    setError(null);

    loadPlayChance()
      .then((nextState) => {
        if (isMounted) setState(nextState);
      })
      .catch((unknownError) => {
        if (!isMounted) return;

        setError(
          unknownError instanceof Error
            ? unknownError
            : new Error("플레이 기회를 불러오지 못했어요."),
        );
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    chanceCount: state?.count ?? 0,
    hasChance: (state?.count ?? 0) > 0,
    date: state?.date ?? null,
    isLoading,
    error,
    refresh,
    charge,
    consume,
  };
};
