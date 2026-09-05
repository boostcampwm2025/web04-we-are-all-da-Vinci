import { serverTossApi } from "@/shared/api";
import { QUERY_STALE_TIME } from "@/shared/config";
import { queryOptions } from "@tanstack/react-query";

/** 닉네임 등 거의 불변. 영속 대상이라 콜드 첫 프레임에도 닉네임 칩이 뜬다. 사용자 경계는 세션 clear가 담당. */
export const userQueries = {
  all: () => ["user"] as const,
  me: () =>
    queryOptions({
      queryKey: [...userQueries.all(), "me"],
      queryFn: ({ signal }) => serverTossApi.getMe({ signal }),
      staleTime: QUERY_STALE_TIME.IMMUTABLE,
      meta: { persist: true },
    }),
};
