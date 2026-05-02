import { serverTossApi } from "@/shared/api";
import { useAbortableQuery } from "@/shared/hooks/useAbortableQuery";
import { useCallback } from "react";

type DrawingDetail = Awaited<ReturnType<typeof serverTossApi.getDrawing>>;

const useDrawing = (drawingId: string | undefined) => {
  const queryFn = useCallback(
    ({ signal }: { signal: AbortSignal }) => {
      if (!drawingId) {
        return Promise.resolve(null);
      }

      return serverTossApi.getDrawing(drawingId, { signal });
    },
    [drawingId],
  );

  const { data, isLoading } = useAbortableQuery<DrawingDetail | null>(queryFn);

  return {
    drawing: data,
    isLoading,
  };
};

export { useDrawing };
