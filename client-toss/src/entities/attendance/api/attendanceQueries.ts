import { serverTossApi } from "@/shared/api";
import { QUERY_STALE_TIME } from "@/shared/config";
import { getKstDate } from "@/shared/lib";
import { queryOptions } from "@tanstack/react-query";

/** 출석 현황은 하루 1회 경계 — KST 날짜를 키에 넣어 자정을 넘기면 새 키(=새 요청)가 된다. */
export const attendanceQueries = {
  all: () => ["attendance"] as const,
  status: () =>
    queryOptions({
      queryKey: [...attendanceQueries.all(), "status", getKstDate()],
      queryFn: ({ signal }) => serverTossApi.getAttendanceStatus({ signal }),
      staleTime: QUERY_STALE_TIME.IMMUTABLE,
      meta: { persist: true },
    }),
};
