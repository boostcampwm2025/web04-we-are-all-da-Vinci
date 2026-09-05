import { useQuery } from "@tanstack/react-query";
import { podiumQueries } from "../api/podiumQueries";

const usePodium = () => {
  const { data, isLoading } = useQuery(podiumQueries.today());
  return {
    podium: data?.podium,
    participantCount: data?.participantCount,
    isLoading,
  };
};

export { usePodium };
