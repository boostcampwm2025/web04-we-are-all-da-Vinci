import type { Stroke } from '@/entities/similarity';
import { calculateStrokeScale, transformPoint } from '@/shared/lib';
import type { RefObject } from 'react';

export const drawStrokesOnCanvas = (
  canvasRef: RefObject<HTMLCanvasElement | null>,
  ctxRef: RefObject<CanvasRenderingContext2D | null>,
  strokes: Stroke[],
  shouldScale: boolean = true,
) => {
  const ctx = ctxRef.current;
  const canvas = canvasRef.current;
  if (!ctx || !canvas || !strokes) return;

  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // shouldScale일 때만 계산
  const scaleInfo = shouldScale
    ? calculateStrokeScale(strokes, canvas.width, canvas.height)
    : null;

  strokes.forEach((stroke) => {
    const [xPoints, yPoints] = stroke.points;
    const [r, g, b] = stroke.color;

    ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.beginPath();

    if (xPoints.length > 0) {
      if (shouldScale && scaleInfo) {
        const { scale, offsetX, offsetY } = scaleInfo;
        const { x, y } = transformPoint(
          xPoints[0],
          yPoints[0],
          scale,
          offsetX,
          offsetY,
        );
        ctx.moveTo(x, y);
        for (let i = 1; i < xPoints.length; i++) {
          const transformed = transformPoint(
            xPoints[i],
            yPoints[i],
            scale,
            offsetX,
            offsetY,
          );
          ctx.lineTo(transformed.x, transformed.y);
        }
      } else {
        ctx.moveTo(xPoints[0], yPoints[0]);
        for (let i = 1; i < xPoints.length; i++) {
          ctx.lineTo(xPoints[i], yPoints[i]);
        }
      }
    }
    ctx.stroke();
  });
};
