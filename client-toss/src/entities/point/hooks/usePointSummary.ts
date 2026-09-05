import { useQuery } from "@tanstack/react-query";
import { pointQueries } from "../api/pointQueries";

/** 받은 포인트 요약(누적/오늘). 출석·미션 mutation이 무효화하므로 호출부가 refetch할 필요는 없다. */
export const usePointSummary = () => {
  const { data, isLoading, refetch } = useQuery(pointQueries.summary());
  return { summary: data ?? null, isLoading, refetch };
};
