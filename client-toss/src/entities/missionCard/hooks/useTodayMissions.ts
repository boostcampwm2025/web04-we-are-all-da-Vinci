import { serverTossApi } from "@/shared/api";
import { useAbortableQuery } from "@/shared/hooks/useAbortableQuery";
import type { TodayMissionsResponse } from "@toss/shared";
import { useCallback } from "react";

// 대시보드 카드용 — 오늘의 일일 미션만 경량 조회.
// 순수 조회라 비어 있으면(미배정) 기존 assign 엔드포인트로 배정 후 재조회한다.
// useMyMissions의 fetchOrAssign 패턴과 동일.
const fetchTodayOrAssign = async ({
  signal,
}: {
  signal: AbortSignal;
}): Promise<TodayMissionsResponse> => {
  const result = await serverTossApi.getTodayMissions({ signal });

  if (result.missions.length === 0) {
    await serverTossApi.assignMyMissions({ signal });
    return serverTossApi.getTodayMissions({ signal });
  }

  return result;
};

const useTodayMissions = () => {
  const queryFn = useCallback(fetchTodayOrAssign, []);

  const { data, isLoading, refetch } =
    useAbortableQuery<TodayMissionsResponse>(queryFn);

  return {
    missions: data?.missions ?? [],
    isLoading,
    refetch,
  };
};

export { useTodayMissions };
