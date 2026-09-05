import { serverTossApi } from "@/shared/api";
import { LARGE_RESPONSE_GC_TIME, QUERY_STALE_TIME } from "@/shared/config";
import { getKstDate } from "@/shared/lib";
import { queryOptions } from "@tanstack/react-query";
import { mockRankingList } from "../config/mockRankingList";
import type { RankingListItem } from "../model/types";

const fetchRankingList = (signal: AbortSignal): Promise<RankingListItem[]> => {
  if (import.meta.env.DEV && import.meta.env.VITE_MOCK_RANKING === "true") {
    return Promise.resolve(mockRankingList);
  }
  return serverTossApi.getRankingList({ signal });
};

/** 오늘 랭킹 — 전부 KST 날짜 키. 그림 제출 mutation이 무효화한다. */
export const rankingQueries = {
  all: () => ["rankings"] as const,
  /** 내 순위·점수. 남이 제출하면 바뀌므로 30초. */
  me: () =>
    queryOptions({
      queryKey: [...rankingQueries.all(), "me", getKstDate()],
      queryFn: ({ signal }) => serverTossApi.getMyRanking({ signal }),
      staleTime: QUERY_STALE_TIME.VOLATILE,
      meta: { persist: true },
    }),
  /** TOP100. 항목마다 strokes가 들어 크다 — 영속 제외, GC 5분. */
  list: () =>
    queryOptions({
      queryKey: [...rankingQueries.all(), "list", getKstDate()],
      queryFn: ({ signal }) => fetchRankingList(signal),
      staleTime: QUERY_STALE_TIME.SNAPSHOT,
      gcTime: LARGE_RESPONSE_GC_TIME,
    }),
};
