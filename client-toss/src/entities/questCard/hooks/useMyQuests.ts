import { serverTossApi } from "@/shared/api";
import { useAbortableQuery } from "@/shared/hooks/useAbortableQuery";
import type { MyQuestsResponse } from "@toss/shared";
import { useCallback } from "react";

const fetchOrAssignQuests = async ({
  signal,
}: {
  signal: AbortSignal;
}): Promise<MyQuestsResponse> => {
  const result = await serverTossApi.getMyQuests({ signal });

  if (result.dailyQuests.length === 0 && result.weeklyQuests.length === 0) {
    return serverTossApi.assignMyQuests({ signal });
  }

  return result;
};

const useMyQuests = () => {
  const queryFn = useCallback(fetchOrAssignQuests, []);

  const { data, isLoading, refetch } =
    useAbortableQuery<MyQuestsResponse>(queryFn);

  return {
    dailyQuests: data?.dailyQuests ?? [],
    weeklyQuests: data?.weeklyQuests ?? [],
    isLoading,
    refetch,
  };
};

export { useMyQuests };
