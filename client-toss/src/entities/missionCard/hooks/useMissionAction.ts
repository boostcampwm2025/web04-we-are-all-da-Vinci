import { getKstDate } from "@/shared/lib";
import type { MissionAction } from "@toss/shared";
import { useEffect, useRef } from "react";
import { useReportMissionAction } from "../api/missionMutations";

/**
 * 페이지 마운트 시 미션 액션을 서버에 1회 보고한다.
 * sessionStorage로 세션 내 중복 호출을 방지하고,
 * 서버 측에서도 이미 완료된 미션은 무시하므로 멱등하다.
 * 보고 성공 시 미션 목록 캐시를 무효화해 완료된 미션이 제자리에서 갱신된다.
 */
const useMissionAction = (actionType: MissionAction["actionType"]) => {
  const reported = useRef(false);
  const { mutateAsync: report } = useReportMissionAction();

  useEffect(() => {
    // KST 날짜를 키에 포함해, 세션이 자정을 넘겨도 일일/주간 액션이 다시 보고되게 한다.
    const key = `mission_action_${actionType}_${getKstDate()}`;
    if (sessionStorage.getItem(key) || reported.current) return;

    reported.current = true;
    sessionStorage.setItem(key, "1");
    report(actionType).catch(() => {
      // 실패 시 다음 세션에서 재시도할 수 있도록 sessionStorage 제거
      sessionStorage.removeItem(key);
    });
  }, [actionType, report]);
};

export { useMissionAction };
