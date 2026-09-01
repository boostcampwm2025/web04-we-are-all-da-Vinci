import { useCallback, useRef } from "react";
export const useInFlight = <R>(): ((task: () => Promise<R>) => Promise<R>) => {
  const inFlight = useRef<Promise<R> | null>(null);

  return useCallback((task: () => Promise<R>) => {
    if (inFlight.current) return inFlight.current;
    const running = task().finally(() => {
      inFlight.current = null;
    });
    inFlight.current = running;
    return running;
  }, []);
};
