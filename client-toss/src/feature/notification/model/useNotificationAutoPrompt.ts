import { formatLocalDate } from "@/shared/lib";
import { useQueries } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { agreementQueries } from "../api/agreementQueries";
import { ENABLED_NOTIFICATION_TYPES } from "../config";

// 게임 완료 후, 아직 응답하지 않은(unknown) 알림 동의가 하나라도 있으면 동의 시트를
// 하루 1회 자동 노출한다.
// - 하루 1회: notifPromptShown_<날짜> 플래그로 그날 한 번만(닫거나 응답해도 그날은 다시 안 뜸).
// - 거부(rejected)·동의(agreed)한 항목은 "응답 완료"로 보고 대상에서 제외 — 거부한 알림을
//   매일 재권유하면 다크패턴이 되므로 미응답(unknown)일 때만 권유한다.
// - 개별 조회 실패는 대상에서 제외해 한 타입의 오류가 나머지를 막지 않게 한다.
export const useNotificationAutoPrompt = (enabled: boolean) => {
  const [open, setOpen] = useState(false);

  const { allSettled, hasPending } = useQueries({
    queries: ENABLED_NOTIFICATION_TYPES.map((type) => ({
      ...agreementQueries.status(type),
      enabled,
    })),
    combine: (results) => ({
      allSettled: results.every((result) => result.isSuccess || result.isError),
      hasPending: results.some((result) => result.data?.status === "unknown"),
    }),
  });

  useEffect(() => {
    if (!enabled || !allSettled || !hasPending) return;
    const shownKey = `notifPromptShown_${formatLocalDate()}`;
    if (localStorage.getItem(shownKey)) return;
    localStorage.setItem(shownKey, "1");
    setOpen(true);
  }, [enabled, allSettled, hasPending]);

  return { open, close: () => setOpen(false) };
};
