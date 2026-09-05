import { serverTossApi } from "@/shared/api";
import { LARGE_RESPONSE_GC_TIME, QUERY_STALE_TIME } from "@/shared/config";
import { queryOptions } from "@tanstack/react-query";

/** 제출된 그림은 절대 안 바뀐다. strokes 포함 — 영속 제외, GC 5분. drawingId가 키라 param 변경이 곧 새 요청. */
export const drawingQueries = {
  all: () => ["drawing"] as const,
  detail: (drawingId: string) =>
    queryOptions({
      queryKey: [...drawingQueries.all(), drawingId],
      queryFn: ({ signal }) => serverTossApi.getDrawing(drawingId, { signal }),
      staleTime: QUERY_STALE_TIME.IMMUTABLE,
      gcTime: LARGE_RESPONSE_GC_TIME,
    }),
};
