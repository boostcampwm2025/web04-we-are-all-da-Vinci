import type { Stroke } from "@toss/shared";
import type { RefObject } from "react";
import { getCanvasBackgroundColor } from "./canvasBackground";

const LOOP_DELAY_MS = 1000; // 루프 재시작 전 대기 시간(ms)
const NORMALIZE_SIZE = 500; // strokes는 500x500 정규화 좌표로 저장됨 (normalizeStrokes 참조)

export const animateDrawing = (
  canvasRef: RefObject<HTMLCanvasElement | null>,
  ctxRef: RefObject<CanvasRenderingContext2D | null>,
  strokes: Stroke[],
  speed: number, // 한 점 그리는 최소 시간(ms)
  loop: boolean,
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
  };

  const dpr = window.devicePixelRatio || 1;
  const logicalWidth = canvas.width / dpr;
  const logicalHeight = canvas.height / dpr;
  // 정규화 공간(500x500) → 캔버스 logical 공간 변환 비율
  const scale = logicalWidth / NORMALIZE_SIZE;

  const backgroundColor = getCanvasBackgroundColor();
  const clearCanvas = () => {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, logicalWidth, logicalHeight);
  };

  const drawPoint = () => {
    const stroke = strokes[state.strokeIndex];
    const [xPoints, yPoints] = stroke.points;
    const [r, g, b] = stroke.color ?? [0, 0, 0];

    const x = xPoints[state.pointIndex] * scale;
    const y = yPoints[state.pointIndex] * scale;

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

  const animate = (timestamp: number) => {
    if (animationId === null) return;

    try {
      if (state.isWaiting) {
        if (timestamp - state.waitStartTime >= LOOP_DELAY_MS) restartLoop();
        else {
          animationId = requestAnimationFrame(animate);
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

      animationId = requestAnimationFrame(animate);
    } catch (error) {
      console.error("리플레이 애니메이션 오류로 중단:", error);
      animationId = null;
    }
  };

  clearCanvas();
  animationId = requestAnimationFrame(animate);

  return () => {
    if (animationId !== null) cancelAnimationFrame(animationId);
    animationId = null;
  };
};
