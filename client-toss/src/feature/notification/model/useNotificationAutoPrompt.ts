import { serverTossApi } from "@/shared/api";
import { formatLocalDate } from "@/shared/lib";
import { useEffect, useState } from "react";

const DAILY_PROMPT_TEMPLATE_CODE =
  import.meta.env.VITE_TOSS_TEMPLATE_DAILY_PROMPT?.trim();
const OVERTAKEN_TEMPLATE_CODE =
  import.meta.env.VITE_TOSS_TEMPLATE_OVERTAKEN?.trim();

// 게임 완료 후, 아직 응답하지 않은(unknown) 알림 동의가 하나라도 있으면 동의 시트를
// 하루 1회 자동 노출한다.
// - 하루 1회: notifPromptShown_<날짜> 플래그로 그날 한 번만(닫거나 응답해도 그날은 다시 안 뜸).
// - 거부(rejected)·동의(agreed)한 항목은 "응답 완료"로 보고 대상에서 제외 — 거부한 알림을
//   매일 재권유하면 다크패턴이 되므로 미응답(unknown)일 때만 권유한다.
export const useNotificationAutoPrompt = (enabled: boolean) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const shownKey = `notifPromptShown_${formatLocalDate()}`;
    if (localStorage.getItem(shownKey)) return;

    let cancelled = false;
    void (async () => {
      const [daily, overtaken] = await Promise.all([
        DAILY_PROMPT_TEMPLATE_CODE
          ? serverTossApi
              .getDailyPromptNotificationAgreement()
              .catch(() => null)
          : null,
        OVERTAKEN_TEMPLATE_CODE
          ? serverTossApi.getOvertakenNotificationAgreement().catch(() => null)
          : null,
      ]);
      if (cancelled) return;

      const hasPending =
        daily?.status === "unknown" || overtaken?.status === "unknown";
      if (hasPending) {
        localStorage.setItem(shownKey, "1");
        setOpen(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { open, close: () => setOpen(false) };
};
