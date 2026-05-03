import { useCallback, useEffect, useRef, useState } from "react";

type QueryFn<T> = (options: { signal: AbortSignal }) => Promise<T>;

const useAbortableQuery = <T>(query: QueryFn<T>) => {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState<boolean | null>(null);

  const controllerRef = useRef<AbortController | null>(null);

  const loadData = useCallback(async () => {
    controllerRef.current?.abort();

    const controller = new AbortController();
    controllerRef.current = controller;

    setIsLoading(true);

    try {
      const data = await query({ signal: controller.signal });

      if (controller.signal.aborted) {
        return;
      }

      setData(data);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }

      setData(null);
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadData();

    return () => {
      controllerRef.current?.abort();
    };
  }, [loadData]);

  return { data, isLoading };
};

export { useAbortableQuery };
