import { serverTossApi } from "@/shared/api";
import { QUERY_STALE_TIME } from "@/shared/config";
import { getKstDate } from "@/shared/lib";
import { queryOptions } from "@tanstack/react-query";

/** 오늘의 시상대(top3·참가자 수). 미리 계산된 배치 스냅샷이라 5분, 오늘 단위라 KST 날짜 키. */
export const podiumQueries = {
  all: () => ["podium"] as const,
  today: () =>
    queryOptions({
      queryKey: [...podiumQueries.all(), getKstDate()],
      queryFn: ({ signal }) => serverTossApi.getPodium({ signal }),
      staleTime: QUERY_STALE_TIME.SNAPSHOT,
      meta: { persist: true },
    }),
};
