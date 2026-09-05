import { QUERY_STALE_TIME } from "@/shared/config";
import { queryOptions } from "@tanstack/react-query";
import type { NotificationTypeConfig } from "../config";

/** 알림 동의 상태 — 사용자가 토글할 때만 바뀐다. 저장 응답으로 setQueryData 해 재조회 없이 갱신한다. */
export const agreementQueries = {
  all: () => ["notifications", "agreement"] as const,
  status: (type: NotificationTypeConfig) =>
    queryOptions({
      queryKey: [...agreementQueries.all(), type.id],
      queryFn: ({ signal }) => type.get({ signal }),
      staleTime: QUERY_STALE_TIME.IMMUTABLE,
      meta: { persist: true },
    }),
};
