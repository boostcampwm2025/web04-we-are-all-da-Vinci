import { formatLocalDate, getAnonymousHash } from "@/shared/lib";
import { useEffect, useRef, useState } from "react";

interface UseDailyAutoStartParams {
  /** 첫 방문 시 자동으로 호출할 도전 시작 함수 */
  start: (source: string) => Promise<unknown>;
  showToast: (text: string) => void;
  locationState: unknown;
}

/**
 * 대시보드 진입 시 일일 1회 자동시작·day-lock·제출 복귀 토스트를 처리한다.
 * - 오늘 이미 플레이했으면 자동시작하지 않고 대시보드만 보여준다(`playedToday`).
 * - `fromSubmitted`로 돌아온 경우 적립/등록 토스트를 띄운다.
 * - 그 외 첫 방문이면 마운트당 1회 `start("auto")`로 바로 진입한다.
 */
export const useDailyAutoStart = ({
  start,
  showToast,
  locationState,
}: UseDailyAutoStartParams) => {
  const [initialLoading, setInitialLoading] = useState(true);
  const [playedToday, setPlayedToday] = useState(false);
  const autoStartedRef = useRef(false);

  useEffect(() => {
    const fromSubmitted = (locationState as { fromSubmitted?: boolean })
      ?.fromSubmitted;

    const init = async () => {
      const hash = await getAnonymousHash();
      const today = formatLocalDate();
      const lastPlayed = localStorage.getItem(`lastPlayed_${hash}`);
      setPlayedToday(lastPlayed === today);

      if (fromSubmitted) {
        // state를 즉시 제거하여 재마운트 시 토스트 재표시 방지
        window.history.replaceState({}, "");
        showToast("그림을 등록했어요");
        setInitialLoading(false);
        return;
      }

      if (lastPlayed === today) {
        setInitialLoading(false);
        return;
      }

      // effect가 두 번 실행돼도 자동시작은 마운트당 1회만 — 이중 호출 방지
      if (autoStartedRef.current) {
        setInitialLoading(false);
        return;
      }
      autoStartedRef.current = true;

      try {
        await start("auto");
      } finally {
        setInitialLoading(false);
      }
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationState]);

  return { initialLoading, playedToday };
};
