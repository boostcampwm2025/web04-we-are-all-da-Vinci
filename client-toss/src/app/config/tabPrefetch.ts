import { archiveQueries } from "@/entities/archive";
import { attendanceQueries } from "@/entities/attendance";
import { missionQueries } from "@/entities/missionCard";
import { podiumQueries } from "@/entities/podium";
import { pointQueries } from "@/entities/point";
import { rankingQueries } from "@/entities/ranking";
import { userQueries } from "@/entities/user";
import { HOME_PATH } from "@/shared/ui/bottomNav";
import type { QueryClient } from "@tanstack/react-query";

/**
 * 탭이 처음 그려질 때 필요한 쿼리 — 터치 다운(의도) 시점에 미리 요청해 첫 왕복을 앞당긴다.
 * prefetchQuery는 staleTime 안이면 아무것도 하지 않으므로 캐시가 있으면 비용이 없다.
 */
const TAB_QUERIES: Record<string, (queryClient: QueryClient) => void> = {
  [HOME_PATH]: (qc) => {
    void qc.prefetchQuery(attendanceQueries.status());
    void qc.prefetchQuery(pointQueries.summary());
    void qc.prefetchQuery(missionQueries.today());
    void qc.prefetchQuery(podiumQueries.today());
    void qc.prefetchQuery(rankingQueries.me());
  },
  "/archive": (qc) => {
    void qc.prefetchQuery(userQueries.me());
    void qc.prefetchQuery(archiveQueries.summary());
  },
  "/mission": (qc) => {
    void qc.prefetchQuery(missionQueries.mine());
    void qc.prefetchQuery(attendanceQueries.status());
  },
  "/ranking": (qc) => {
    void qc.prefetchQuery(rankingQueries.list());
  },
};

export const prefetchTab = (queryClient: QueryClient, path: string) => {
  TAB_QUERIES[path]?.(queryClient);
};
