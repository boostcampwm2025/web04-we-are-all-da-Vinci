import { serverTossApi } from "@/shared/api";
import { QUERY_STALE_TIME } from "@/shared/config";
import { getKstDate } from "@/shared/lib";
import { queryOptions } from "@tanstack/react-query";

/** todayPoints가 날짜 단위라 키에 KST 날짜. 출석·미션으로 바뀌는 값이라 30초. */
export const pointQueries = {
  all: () => ["points"] as const,
  summary: () =>
    queryOptions({
      queryKey: [...pointQueries.all(), "summary", getKstDate()],
      queryFn: ({ signal }) => serverTossApi.getPointSummary({ signal }),
      staleTime: QUERY_STALE_TIME.VOLATILE,
      meta: { persist: true },
    }),
};
