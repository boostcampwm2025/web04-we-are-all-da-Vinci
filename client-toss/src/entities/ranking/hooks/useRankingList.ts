import { serverTossApi } from "@/shared/api";
import { useCallback } from "react";
import type { RankingListItem } from "../model/types";
import { useAbortableQuery } from "@/shared/hooks/useAbortableQuery";

const useRankingList = () => {
  const queryFn = useCallback(
    ({ signal }: { signal: AbortSignal }) =>
      serverTossApi.getRankingList({ signal }),
    [],
  );

  const { data, isLoading } = useAbortableQuery<RankingListItem[]>(queryFn);

  return {
    rankingList: data,
    isLoading,
  };
};

export { useRankingList };
