import { serverTossApi } from "@/shared/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { MissionAction } from "@toss/shared";
import { missionQueries } from "./missionQueries";

/** 액션 보고가 미션을 완료시킬 수 있으므로 성공 시 미션 목록(오늘·전체)을 무효화한다. */
export const useReportMissionAction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (actionType: MissionAction["actionType"]) =>
      serverTossApi.reportMissionAction(actionType),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: missionQueries.all() }),
  });
};
