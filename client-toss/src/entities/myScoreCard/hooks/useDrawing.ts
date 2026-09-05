import { skipToken, useQuery } from "@tanstack/react-query";
import { drawingQueries } from "../api/drawingQueries";

const useDrawing = (drawingId: string | undefined) => {
  const { data, isLoading } = useQuery({
    ...drawingQueries.detail(drawingId ?? ""),
    // id가 없으면 요청하지 않는다(isLoading=false, drawing=null → 호출부의 "찾을 수 없음" 분기).
    queryFn: drawingId ? drawingQueries.detail(drawingId).queryFn : skipToken,
  });
  return { drawing: data ?? null, isLoading };
};

export { useDrawing };
