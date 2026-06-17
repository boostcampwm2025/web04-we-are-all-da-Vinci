import { serverTossApi } from "@/shared/api";
import { useAbortableQuery } from "@/shared/hooks";
import type { AttendanceStatusResponse } from "@toss/shared";
import { useCallback } from "react";

/** 출석 현황(연속일·내일 최대 포인트·누적/오늘 포인트)을 조회한다. */
export const useAttendanceStatus = () => {
  const queryFn = useCallback(
    ({ signal }: { signal: AbortSignal }) =>
      serverTossApi.getAttendanceStatus({ signal }),
    [],
  );

  const { data, isLoading, refetch } =
    useAbortableQuery<AttendanceStatusResponse>(queryFn);

  return { status: data, isLoading, refetch };
};
