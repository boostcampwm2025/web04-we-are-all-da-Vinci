/** CSS 변수 미해석 환경(jsdom 등) 대비 폴백 — index.css의 --color-canvas와 동일하게 유지 */
const FALLBACK_CANVAS_BG = "#f3f0e9";

/** index.css의 `--color-canvas` 값을 런타임에 읽어 캔버스 배경색으로 반환 */
export const getCanvasBackgroundColor = (): string =>
  getComputedStyle(document.documentElement)
    .getPropertyValue("--color-canvas")
    .trim() || FALLBACK_CANVAS_BG;
