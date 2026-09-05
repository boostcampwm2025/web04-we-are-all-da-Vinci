import { useQuery } from "@tanstack/react-query";
import { missionQueries } from "../api/missionQueries";

/** 미션 탭용 — 일일·주간·튜토리얼·챌린지 전체. */
const useMyMissions = () => {
  const { data, isLoading, refetch } = useQuery(missionQueries.mine());
  return {
    dailyMissions: data?.dailyMissions ?? [],
    weeklyMissions: data?.weeklyMissions ?? [],
    tutorialCategories: data?.tutorialCategories ?? [],
    challengeMissions: data?.challengeMissions ?? [],
    isLoading,
    refetch,
  };
};

export { useMyMissions };
