import { serverTossApi } from "@/shared/api";
import { LARGE_RESPONSE_GC_TIME, QUERY_STALE_TIME } from "@/shared/config";
import { getKstDate } from "@/shared/lib";
import { queryOptions } from "@tanstack/react-query";

export const archiveQueries = {
  all: () => ["archive"] as const,
  /** 통계·날짜 목록. 하루 경계에서만 바뀌므로 KST 날짜 키 + Infinity. 그림 제출이 무효화한다. */
  summary: () =>
    queryOptions({
      queryKey: [...archiveQueries.all(), "summary", getKstDate()],
      queryFn: ({ signal }) => serverTossApi.getArchiveSummary({ signal }),
      staleTime: QUERY_STALE_TIME.IMMUTABLE,
      meta: { persist: true },
    }),
  /** KST 어제까지의 확정 과거 — 불변. prompt·drawings에 strokes가 들어 영속 제외, GC 5분. */
  day: (date: string) =>
    queryOptions({
      queryKey: [...archiveQueries.all(), "day", date],
      queryFn: ({ signal }) => serverTossApi.getArchiveDay(date, { signal }),
      staleTime: QUERY_STALE_TIME.IMMUTABLE,
      gcTime: LARGE_RESPONSE_GC_TIME,
    }),
};
