import { serverTossApi } from "@/shared/api";
import { QUERY_STALE_TIME } from "@/shared/config";
import { getKstDate } from "@/shared/lib";
import { queryOptions } from "@tanstack/react-query";
import type { MyMissionsResponse, TodayMissionsResponse } from "@toss/shared";

// 순수 조회라 비어 있으면(미배정) assign 엔드포인트로 배정 후 재조회한다.
// 배정 POST에는 signal을 넘기지 않는다 — 탭을 떠나 GET이 취소돼도 배정 자체가 취소되면 안 된다.
const fetchTodayOrAssign = async (
  signal: AbortSignal,
): Promise<TodayMissionsResponse> => {
  const result = await serverTossApi.getTodayMissions({ signal });
  if (result.missions.length === 0) {
    await serverTossApi.assignMyMissions();
    return serverTossApi.getTodayMissions({ signal });
  }
  return result;
};

const fetchMineOrAssign = async (
  signal: AbortSignal,
): Promise<MyMissionsResponse> => {
  const result = await serverTossApi.getMyMissions({ signal });
  if (
    result.dailyMissions.length === 0 &&
    result.weeklyMissions.length === 0 &&
    result.tutorialCategories.length === 0
  ) {
    return serverTossApi.assignMyMissions();
  }
  return result;
};

/** 일일 경계(KST 날짜 키) + 액션마다 진행도가 바뀌므로 1분. 미션 액션·초대·제출 mutation이 무효화한다. */
export const missionQueries = {
  all: () => ["missions"] as const,
  today: () =>
    queryOptions({
      queryKey: [...missionQueries.all(), "today", getKstDate()],
      queryFn: ({ signal }) => fetchTodayOrAssign(signal),
      staleTime: QUERY_STALE_TIME.MISSIONS,
      meta: { persist: true },
    }),
  mine: () =>
    queryOptions({
      queryKey: [...missionQueries.all(), "me", getKstDate()],
      queryFn: ({ signal }) => fetchMineOrAssign(signal),
      staleTime: QUERY_STALE_TIME.MISSIONS,
      meta: { persist: true },
    }),
};
