import type { Stroke } from '@/entities/similarity/model';
import type { RefObject } from 'react';

// 캔버스에 strokes를 그리는 유틸 함수
export const drawStrokesOnCanvas = (
  canvasRef: RefObject<HTMLCanvasElement | null>,
  ctxRef: RefObject<CanvasRenderingContext2D | null>,
  strokes: Stroke[],
) => {
  const ctx = ctxRef.current;
  const canvas = canvasRef.current;
  if (!ctx || !canvas) return;

  // 캔버스 초기화
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 모든 strokes 그리기
  strokes.forEach((stroke) => {
    const [xPoints, yPoints] = stroke.points;
    const [r, g, b] = stroke.color;

    ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.beginPath();
    if (xPoints.length > 0) {
      ctx.moveTo(xPoints[0], yPoints[0]);
      for (let i = 1; i < xPoints.length; i++) {
        ctx.lineTo(xPoints[i], yPoints[i]);
      }
    }
    ctx.stroke();
  });
};
