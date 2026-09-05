import { useQuery } from "@tanstack/react-query";
import { attendanceQueries } from "../api/attendanceQueries";

/**
 * 출석 현황(연속일·내일 최대 포인트·누적/오늘 포인트)을 조회한다.
 * 캐시 hit이면 첫 렌더에 마지막 값이 있다. isLoading은 "값 없음 + 요청 중"에만 true —
 * 백그라운드 갱신(isFetching)에는 반응하지 않아 값이 플레이스홀더로 되돌아가지 않는다.
 */
export const useAttendanceStatus = () => {
  const { data, isLoading, refetch } = useQuery(attendanceQueries.status());
  return { status: data ?? null, isLoading, refetch };
};
