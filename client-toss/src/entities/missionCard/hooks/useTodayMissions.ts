import { useQuery } from "@tanstack/react-query";
import { missionQueries } from "../api/missionQueries";

/** 대시보드 카드용 — 오늘의 일일 미션만 경량 조회. */
const useTodayMissions = () => {
  const { data, isLoading, refetch } = useQuery(missionQueries.today());
  return { missions: data?.missions ?? [], isLoading, refetch };
};

export { useTodayMissions };
