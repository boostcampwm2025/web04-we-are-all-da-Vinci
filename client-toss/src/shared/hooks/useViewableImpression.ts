import { useEffect, useRef, type RefObject } from "react";
import { trackImpression } from "@/shared/lib";

// IAB MRC Viewable Impression 기준: 광고 영역의 50% 이상이 1초 이상 "연속" 노출돼야
// 1회 노출로 집계한다(단순 threshold 진입 1회 계측과 구분).
const VIEWABLE_RATIO = 0.5;
const VIEWABLE_DURATION_MS = 1000;

/**
 * ref 요소가 IAB Viewable 기준(면적 50% · 1초 연속)을 충족하면 trackImpression을 1회 발화한다.
 *
 * - 50% 이상으로 진입하면 1초 카운트를 시작한다.
 * - 1초를 채우기 전에 50% 미만으로 이탈하면 연속성이 깨진 것으로 보고 카운트를 리셋한다.
 *   (다시 50% 이상으로 들어오면 1초를 처음부터 다시 잰다.)
 * - 한 번 발화하면 옵저버를 끊어 중복 집계를 막는다.
 *
 * 외부에서 이미 보유한 ref를 받는다 — 같은 DOM 노드를 광고 SDK 부착 등 다른 용도와 공유하기 위함.
 */
const useViewableImpression = (
  ref: RefObject<HTMLElement | null>,
  logName: string,
  params?: Record<string, unknown>,
) => {
  const logNameRef = useRef(logName);
  const paramsRef = useRef(params);

  // 옵저버 effect는 ref 변경에만 의존하므로, logName·params가 바뀌어도 재구독하지 않는다.
  // 발화 시 최신값을 쓰도록 매 렌더 후 ref를 동기화한다.
  useEffect(() => {
    logNameRef.current = logName;
    paramsRef.current = params;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let dwellTimer: ReturnType<typeof setTimeout> | null = null;
    let fired = false;

    const clearDwell = () => {
      if (dwellTimer !== null) {
        clearTimeout(dwellTimer);
        dwellTimer = null;
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (fired) return;

        if (entry.intersectionRatio >= VIEWABLE_RATIO) {
          // 50% 이상 진입 → 1초 연속 노출 카운트 시작 (이미 카운트 중이면 그대로 유지).
          if (dwellTimer === null) {
            dwellTimer = setTimeout(() => {
              fired = true;
              dwellTimer = null;
              trackImpression(logNameRef.current, paramsRef.current);
              observer.disconnect();
            }, VIEWABLE_DURATION_MS);
          }
        } else {
          // 1초 채우기 전에 50% 미만으로 이탈 → 연속성 깨짐, 카운트 리셋.
          clearDwell();
        }
      },
      { threshold: [VIEWABLE_RATIO] },
    );

    observer.observe(el);
    return () => {
      clearDwell();
      observer.disconnect();
    };
  }, [ref]);
};

export { useViewableImpression };
