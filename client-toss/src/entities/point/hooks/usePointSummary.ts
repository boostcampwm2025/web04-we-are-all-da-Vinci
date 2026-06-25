import { serverTossApi } from "@/shared/api";
import { useAbortableQuery } from "@/shared/hooks";
import type { PointSummaryResponse } from "@toss/shared";
import { useCallback } from "react";

/** 받은 포인트 요약(누적/오늘). 포인트 변동 시 refetch로 즉시 재조회한다. */
export const usePointSummary = () => {
  const queryFn = useCallback(
    ({ signal }: { signal: AbortSignal }) =>
      serverTossApi.getPointSummary({ signal }),
    [],
  );

  const { data, isLoading, refetch } =
    useAbortableQuery<PointSummaryResponse>(queryFn);

  return { summary: data, isLoading, refetch };
};
