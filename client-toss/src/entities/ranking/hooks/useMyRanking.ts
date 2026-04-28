import { serverTossApi } from "@/shared/api";
import { useCallback } from "react";
import type { MyRankingResponse } from "@/entities/ranking";
import { useAbortableQuery } from "@/shared/hooks/useAbortableQuery";

export const useMyRanking = () => {
  const queryFn = useCallback(
    ({ signal }: { signal: AbortSignal }) =>
      serverTossApi.getMyRanking({ signal }),
    [],
  );

  const { data, isLoading } = useAbortableQuery<MyRankingResponse>(queryFn);

  return { myRanking: data, isLoading };
};
