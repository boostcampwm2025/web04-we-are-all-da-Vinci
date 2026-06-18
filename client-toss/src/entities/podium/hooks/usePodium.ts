import { serverTossApi } from "@/shared/api";
import { useCallback } from "react";
import type { PodiumResponse } from "../model/types";
import { useAbortableQuery } from "@/shared/hooks/useAbortableQuery";

const usePodium = () => {
  const queryFn = useCallback(
    ({ signal }: { signal: AbortSignal }) =>
      serverTossApi.getPodium({ signal }),
    [],
  );

  const { data, isLoading } = useAbortableQuery<PodiumResponse>(queryFn);

  return {
    podium: data?.podium,
    participantCount: data?.participantCount,
    isLoading,
  };
};

export { usePodium };
