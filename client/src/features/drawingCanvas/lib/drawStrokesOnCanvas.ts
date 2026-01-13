import type { Stroke } from '@/entities/similarity/model';
import { calculateStrokeScale, transformPoint } from '@/shared/lib/scaleStrokesToCanvas';
import type { RefObject } from 'react';

// 캔버스에 strokes를 그리는 유틸 함수
export const drawStrokesOnCanvas = (
  canvasRef: RefObject<HTMLCanvasElement | null>,
  ctxRef: RefObject<CanvasRenderingContext2D | null>,
  strokes: Stroke[],
) => {
  const ctx = ctxRef.current;
  const canvas = canvasRef.current;
  if (!ctx || !canvas || strokes.length === 0) return;

  // 캔버스 초기화
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // strokes를 캔버스에 맞게 스케일링
  const { scale, offsetX, offsetY } = calculateStrokeScale(
    strokes,
    canvas.width,
    canvas.height,
  );

  // 모든 strokes 그리기
  strokes.forEach((stroke) => {
    const [xPoints, yPoints] = stroke.points;
    const [r, g, b] = stroke.color;

    ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.beginPath();
    if (xPoints.length > 0) {
      const { x, y } = transformPoint(xPoints[0], yPoints[0], scale, offsetX, offsetY);
      ctx.moveTo(x, y);
      for (let i = 1; i < xPoints.length; i++) {
        const transformed = transformPoint(xPoints[i], yPoints[i], scale, offsetX, offsetY);
        ctx.lineTo(transformed.x, transformed.y);
      }
    }
    ctx.stroke();
  });
};
