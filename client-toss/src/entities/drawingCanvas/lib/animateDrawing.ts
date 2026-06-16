import type { Stroke } from "@toss/shared";
import type { RefObject } from "react";
import { getCanvasBackgroundColor } from "./canvasBackground";
import { calculateStrokeScale, transformPoint } from "./scaleStrokes";

const LOOP_DELAY_MS = 1000; // 루프 재시작 전 대기 시간(ms)
const NORMALIZE_SIZE = 500; // strokes는 500x500 정규화 좌표로 저장됨 (normalizeStrokes 참조)

export const animateDrawing = (
  canvasRef: RefObject<HTMLCanvasElement | null>,
  ctxRef: RefObject<CanvasRenderingContext2D | null>,
  strokes: Stroke[],
  speed: number, // 한 점 그리는 최소 시간(ms)
  loop: boolean,
  targetDurationMs?: number, // 리플레이 최대 지속 시간. speed보다 우선 적용
  shouldScale?: boolean,
): (() => void) => {
  const canvas = canvasRef.current;
  const ctx = ctxRef.current;
  if (!canvas || !ctx || strokes.length === 0) return () => {};

  const state = {
    strokeIndex: 0,
    pointIndex: 0,
    lastDrawTime: 0,
    isWaiting: false,
    waitStartTime: 0,
    startTime: 0,
    totalPointCount: strokes.reduce(
      (sum, stroke) => sum + stroke.points[0].length,
      0,
    ),
    drawnPointCount: 0,
  };

  const dpr = window.devicePixelRatio || 1;
  const logicalWidth = canvas.width / dpr;
  const logicalHeight = canvas.height / dpr;
  // 정규화 공간(500x500) → 캔버스 logical 공간 변환 비율
  const normalizeScale = logicalWidth / NORMALIZE_SIZE;
  const scaleInfo = shouldScale
    ? calculateStrokeScale(strokes, logicalWidth, logicalHeight)
    : null;

  const backgroundColor = getCanvasBackgroundColor();
  const clearCanvas = () => {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, logicalWidth, logicalHeight);
  };

  const drawPoint = () => {
    const stroke = strokes[state.strokeIndex];
    const [xPoints, yPoints] = stroke.points;
    const [r, g, b] = stroke.color ?? [0, 0, 0];

    const rawX = xPoints[state.pointIndex];
    const rawY = yPoints[state.pointIndex];

    const { x, y } =
      shouldScale && scaleInfo
        ? transformPoint(
            rawX,
            rawY,
            scaleInfo.scale,
            scaleInfo.offsetX,
            scaleInfo.offsetY,
          )
        : { x: rawX * normalizeScale, y: rawY * normalizeScale };

    if (state.pointIndex === 0) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
    } else if (state.pointIndex < xPoints.length) {
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    state.pointIndex++;
  };

  const goToNextStroke = () => {
    state.strokeIndex++;
    state.pointIndex = 0;
    state.lastDrawTime = 0;
  };

  const restartLoop = () => {
    clearCanvas();
    state.strokeIndex = 0;
    state.pointIndex = 0;
    state.lastDrawTime = 0;
    state.isWaiting = false;
  };

  let animationId: number | null = null;

  const animateBySpeed = (timestamp: number) => {
    if (animationId === null) return;

    try {
      if (state.isWaiting) {
        if (timestamp - state.waitStartTime >= LOOP_DELAY_MS) restartLoop();
        else {
          animationId = requestAnimationFrame(animateBySpeed);
          return;
        }
      }

      if (timestamp - state.lastDrawTime >= speed) {
        state.lastDrawTime = timestamp;
        drawPoint();
      }

      if (state.pointIndex >= strokes[state.strokeIndex].points[0].length)
        goToNextStroke();

      if (state.strokeIndex >= strokes.length) {
        if (loop) {
          state.isWaiting = true;
          state.waitStartTime = timestamp;
        } else return;
      }

      animationId = requestAnimationFrame(animateBySpeed);
    } catch (error) {
      console.error("리플레이 애니메이션 오류로 중단:", error);
      animationId = null;
    }
  };

  const animateByDuration = (timestamp: number) => {
    if (animationId === null) return;

    try {
      if (state.startTime === 0) {
        state.startTime = timestamp;
      }

      const elapsed = timestamp - state.startTime;
      const progress = Math.min(elapsed / targetDurationMs!, 1);
      const easedProgress = easeOutCubic(progress);
      const targetPointCount = Math.floor(
        state.totalPointCount * easedProgress,
      );

      while (
        state.drawnPointCount < targetPointCount &&
        state.strokeIndex < strokes.length
      ) {
        drawPoint();
        state.drawnPointCount++;

        if (
          state.strokeIndex < strokes.length &&
          state.pointIndex >= strokes[state.strokeIndex].points[0].length
        ) {
          goToNextStroke();
        }
      }

      if (state.strokeIndex >= strokes.length) {
        return;
      }
      animationId = requestAnimationFrame(animateByDuration);
    } catch (error) {
      console.error("리플레이 애니메이션 오류로 중단:", error);
      animationId = null;
    }
  };

  const animateFrame =
    targetDurationMs != null ? animateByDuration : animateBySpeed;

  clearCanvas();
  animationId = requestAnimationFrame(animateFrame);

  return () => {
    if (animationId !== null) cancelAnimationFrame(animationId);
    animationId = null;
  };
};

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
