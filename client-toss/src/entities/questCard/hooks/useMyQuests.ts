import { serverTossApi } from "@/shared/api";
import { useAbortableQuery } from "@/shared/hooks/useAbortableQuery";
import type { MyQuestsResponse } from "@toss/shared";
import { useCallback } from "react";

const useMyQuests = () => {
  const queryFn = useCallback(
    ({ signal }: { signal: AbortSignal }) =>
      serverTossApi.getMyQuests({ signal }),
    [],
  );

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
