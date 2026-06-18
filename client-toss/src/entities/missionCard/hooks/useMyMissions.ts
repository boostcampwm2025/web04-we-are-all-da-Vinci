import { serverTossApi } from "@/shared/api";
import { useAbortableQuery } from "@/shared/hooks/useAbortableQuery";
import type { MyMissionsResponse } from "@toss/shared";
import { useCallback } from "react";

const fetchOrAssignMissions = async ({
  signal,
}: {
  signal: AbortSignal;
}): Promise<MyMissionsResponse> => {
  const result = await serverTossApi.getMyMissions({ signal });

  if (
    result.dailyMissions.length === 0 &&
    result.weeklyMissions.length === 0 &&
    result.tutorialCategories.length === 0
  ) {
    return serverTossApi.assignMyMissions({ signal });
  }

  return result;
};

const useMyMissions = () => {
  const queryFn = useCallback(fetchOrAssignMissions, []);

  const { data, isLoading, refetch } =
    useAbortableQuery<MyMissionsResponse>(queryFn);

  return {
    dailyMissions: data?.dailyMissions ?? [],
    weeklyMissions: data?.weeklyMissions ?? [],
    tutorialCategories: data?.tutorialCategories ?? [],
    isLoading,
    refetch,
  };
};

export { useMyMissions };
