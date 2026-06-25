import { serverTossApi } from "@/shared/api";
import { useCallback } from "react";
import { mockRankingList } from "../config/mockRankingList";
import type { RankingListItem } from "../model/types";
import { useAbortableQuery } from "@/shared/hooks/useAbortableQuery";

const useRankingList = () => {
  const queryFn = useCallback(({ signal }: { signal: AbortSignal }) => {
    if (import.meta.env.DEV && import.meta.env.VITE_MOCK_RANKING === "true") {
      return Promise.resolve(mockRankingList);
    }
    return serverTossApi.getRankingList({ signal });
  }, []);

  const { data, isLoading } = useAbortableQuery<RankingListItem[]>(queryFn);

  return {
    rankingList: data,
    isLoading,
  };
};

export { useRankingList };
