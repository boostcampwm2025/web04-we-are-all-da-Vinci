import { useQuery } from "@tanstack/react-query";
import { rankingQueries } from "../api/rankingQueries";

const useRankingList = () => {
  const { data, isLoading } = useQuery(rankingQueries.list());
  return { rankingList: data ?? null, isLoading };
};

export { useRankingList };
