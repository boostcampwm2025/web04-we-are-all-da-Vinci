import { useQuery } from "@tanstack/react-query";
import { rankingQueries } from "../api/rankingQueries";

/** 같은 키를 구독하는 컴포넌트(대시보드·통계 카드)가 여럿이어도 요청은 한 번만 나간다. */
const useMyRanking = () => {
  const { data, isLoading } = useQuery(rankingQueries.me());
  return { myRanking: data ?? null, isLoading };
};

export { useMyRanking };
