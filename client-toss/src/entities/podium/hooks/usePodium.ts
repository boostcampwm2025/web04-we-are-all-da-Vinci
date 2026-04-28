import { serverTossApi } from "@/shared/api";
import { useCallback } from "react";
import type { PodiumEntry } from "../model/types";
import { useAbortableQuery } from "@/shared/hooks/useAbortableQuery";

const usePodium = () => {
  const queryFn = useCallback(
    ({ signal }: { signal: AbortSignal }) =>
      serverTossApi.getPodium({ signal }),
    [],
  );

  const { data, isLoading } = useAbortableQuery<PodiumEntry[]>(queryFn);

  return {
    podium: data,
    isLoading,
  };
};

export { usePodium };
