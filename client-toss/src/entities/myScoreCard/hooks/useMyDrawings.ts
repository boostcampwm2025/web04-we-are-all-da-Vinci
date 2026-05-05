import { serverTossApi } from "@/shared/api";
import { useAbortableQuery } from "@/shared/hooks/useAbortableQuery";
import type { MyDrawingsResponse } from "@toss/shared";
import { useCallback } from "react";

const useMyDrawings = () => {
  const queryFn = useCallback(
    ({ signal }: { signal: AbortSignal }) =>
      serverTossApi.getMyDrawings({ signal }),
    [],
  );

  const { data, isLoading, refetch } =
    useAbortableQuery<MyDrawingsResponse>(queryFn);

  return {
    myDrawings: data?.drawings ?? [],
    isLoading,
    refetch,
  };
};

export { useMyDrawings };
