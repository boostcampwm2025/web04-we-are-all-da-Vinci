import { pointQueries } from "@/entities/point";
import { serverTossApi } from "@/shared/api";
import {
  type QueryClient,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import type { AdSdkPayload } from "@toss/shared";
import { attendanceQueries } from "./attendanceQueries";

/**
 * "출석이 바뀌면 포인트(마일스톤)도 바뀐다"는 도메인 규칙을 뷰가 아니라 여기서 소유한다.
 * 체크인·복구·포기 세 mutation이 같은 무효화를 공유한다.
 */
export const invalidateAttendanceAndPoints = (queryClient: QueryClient) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: attendanceQueries.all() }),
    queryClient.invalidateQueries({ queryKey: pointQueries.all() }),
  ]);

export const useCheckInAttendance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => serverTossApi.checkInAttendance(),
    onSuccess: () => invalidateAttendanceAndPoints(queryClient),
  });
};

export const useRecoverAttendance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sdkPayload: AdSdkPayload) =>
      serverTossApi.recoverAttendance(sdkPayload),
    onSuccess: () => invalidateAttendanceAndPoints(queryClient),
  });
};

export const useDeclineAttendanceRecovery = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => serverTossApi.declineAttendanceRecovery(),
    onSuccess: () => invalidateAttendanceAndPoints(queryClient),
  });
};
