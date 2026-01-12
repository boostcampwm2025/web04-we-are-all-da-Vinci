import type { Stroke } from '@/entities/similarity/model';
import type { RefObject } from 'react';

const LOOP_DELAY_MS = 1000; // 루프 재시작 전 대기 시간(ms)

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
    strokeIndex: 0, // 현재 그리는 스트로크 인덱스
    pointIndex: 0, // 현재 스트로크에서 그리는 점 인덱스

    lastDrawTime: 0, // 마지막으로 점을 그린 timestamp

    isWaiting: false, // 루프 재시작을 위해 대기 중인지
    waitStartTime: 0, // 루프 대기 시작 timestamp
  };

  const clearCanvas = () => {
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  // 한 점 그리기
  const drawPoint = () => {
    const stroke = strokes[state.strokeIndex];
    const [xPoints, yPoints] = stroke.points;
    const [r, g, b] = stroke.color ?? [0, 0, 0];

    if (state.pointIndex === 0) {
      // 시작점
      ctx.beginPath();
      ctx.moveTo(xPoints[0], yPoints[0]);
      ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
    } else if (state.pointIndex < xPoints.length) {
      // 이어서 그리기
      ctx.lineTo(xPoints[state.pointIndex], yPoints[state.pointIndex]);
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

    // 리플레이 loop 마다 잠시 대기 처리
    if (state.isWaiting) {
      if (timestamp - state.waitStartTime >= LOOP_DELAY_MS) restartLoop();
      else {
        animationId = requestAnimationFrame(animate);
        return;
      }
    }

    // 속도 제어: speed(ms) 만큼 지난 후 다음 점 그리기
    if (timestamp - state.lastDrawTime >= speed) {
      state.lastDrawTime = timestamp;
      drawPoint();
    }

    // 현재 스트로크 그리기 완료 체크
    if (state.pointIndex >= strokes[state.strokeIndex].points[0].length)
      goToNextStroke();

    // 모든 스트로크 그리기 완료 체크
    if (state.strokeIndex >= strokes.length) {
      if (loop) {
        state.isWaiting = true;
        state.waitStartTime = timestamp;
      } else return;
    }

    animationId = requestAnimationFrame(animate);
  };

  clearCanvas();
  animationId = requestAnimationFrame(animate);

  return () => {
    if (animationId !== null) cancelAnimationFrame(animationId);
    animationId = null;
  };
};
