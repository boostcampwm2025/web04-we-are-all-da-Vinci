import { serverTossApi } from "@/shared/api";
import type { QuestAction } from "@toss/shared";
import { useEffect, useRef } from "react";

/**
 * 페이지 마운트 시 퀘스트 액션을 서버에 1회 보고한다.
 * sessionStorage로 세션 내 중복 호출을 방지하고,
 * 서버 측에서도 이미 완료된 퀘스트는 무시하므로 멱등하다.
 */
const useQuestAction = (actionType: QuestAction["actionType"]) => {
  const reported = useRef(false);

  useEffect(() => {
    const key = `quest_action_${actionType}`;
    if (sessionStorage.getItem(key) || reported.current) return;

    reported.current = true;
    sessionStorage.setItem(key, "1");
    serverTossApi.reportQuestAction(actionType).catch(() => {
      // 실패 시 다음 세션에서 재시도할 수 있도록 sessionStorage 제거
      sessionStorage.removeItem(key);
    });
  }, [actionType]);
};

export { useQuestAction };
