import { leaveBreadcrumb } from "./observability";

/**
 * `appLogin()`이 도는 동안 WebView가 가려졌는지 관측한 결과.
 * 토스 동의 시트는 네이티브라 DOM에 남지 않으므로, 가시성 이벤트가 "시트가 실제로 떴는가"의 유일한 단서다.
 */
export interface SheetProbeResult {
  /** hidden/blur 신호가 한 번이라도 왔는가 = 시트(또는 다른 오버레이)가 WebView를 가렸는가 */
  sheetShown: boolean;
  /** 가려져 있던 시간 합계(ms). 멈출 때까지 복귀하지 않았으면 멈춘 시점까지 합산한다 */
  hiddenMs: number;
  /** 가시성 전환 이벤트 수. visibilitychange·blur·focus를 각각 센다 — 어느 이벤트가 실제로 오는지가 이번 계측의 질문이다 */
  transitions: number;
}

export interface SheetProbeOptions {
  doc?: Document;
  win?: Window;
  now?: () => number;
}

export interface SheetProbe {
  /** 리스너를 떼고 결과를 돌려준다. 여러 번 불러도 첫 결과를 그대로 돌려준다. */
  stop: () => SheetProbeResult;
}

export const EMPTY_SHEET_PROBE_RESULT: SheetProbeResult = {
  sheetShown: false,
  hiddenMs: 0,
  transitions: 0,
};

/**
 * `appLogin()` 호출 직전에 시작하고 settle 직후 `stop()`한다.
 * `document.visibilitychange`와 `window`의 `blur`/`focus`를 함께 듣는다 — Android WebView가
 * 네이티브 시트 아래에서 visibilitychange를 내는지 확실하지 않아, 전면 광고 오버레이에서
 * 실제로 튀는 것이 확인된 focus 계열도 같이 기록한다.
 * 이벤트가 하나도 없으면 `{ false, 0, 0 }`을 그대로 보고한다 — 이벤트가 오지 않는 플랫폼을 데이터로 남기기 위해서다.
 */
export const startSheetProbe = ({
  doc,
  win,
  now = Date.now,
}: SheetProbeOptions = {}): SheetProbe => {
  const targetDoc = doc ?? (typeof document === "undefined" ? null : document);
  const targetWin = win ?? (typeof window === "undefined" ? null : window);
  if (!targetDoc || !targetWin) {
    return { stop: () => ({ ...EMPTY_SHEET_PROBE_RESULT }) };
  }

  const startedAt = now();
  let isHidden = false;
  let hiddenSince = 0;
  let hiddenMs = 0;
  let transitions = 0;
  let sheetShown = false;
  let result: SheetProbeResult | null = null;

  // blur와 visibilitychange(hidden)가 연달아 와도 isHidden 플래그로 구간을 한 번만 센다.
  const record = (event: string, hidden: boolean) => {
    transitions += 1;
    if (hidden && !isHidden) {
      isHidden = true;
      hiddenSince = now();
      sheetShown = true;
    } else if (!hidden && isHidden) {
      hiddenMs += now() - hiddenSince;
      isHidden = false;
    }
    leaveBreadcrumb("auth", "로그인 시트 가시성 변화", {
      event,
      state: hidden ? "hidden" : "visible",
      elapsed_ms: now() - startedAt,
    });
  };

  const onVisibilityChange = () =>
    record("visibilitychange", targetDoc.visibilityState === "hidden");
  const onBlur = () => record("blur", true);
  const onFocus = () => record("focus", false);

  targetDoc.addEventListener("visibilitychange", onVisibilityChange);
  targetWin.addEventListener("blur", onBlur);
  targetWin.addEventListener("focus", onFocus);

  return {
    stop: () => {
      if (result) return result;
      targetDoc.removeEventListener("visibilitychange", onVisibilityChange);
      targetWin.removeEventListener("blur", onBlur);
      targetWin.removeEventListener("focus", onFocus);
      // WebView 리로드 등으로 복귀 이벤트가 영영 오지 않는 경우를 대비해 멈춘 시점까지 합산한다.
      if (isHidden) {
        hiddenMs += now() - hiddenSince;
        isHidden = false;
      }
      result = { sheetShown, hiddenMs, transitions };
      leaveBreadcrumb("auth", "로그인 시트 관측 종료", {
        sheet_shown: sheetShown,
        sheet_hidden_ms: hiddenMs,
        visibility_transitions: transitions,
      });
      return result;
    },
  };
};
