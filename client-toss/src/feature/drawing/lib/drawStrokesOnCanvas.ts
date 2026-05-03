import type { Stroke } from "@toss/shared";
import { calculateStrokeScale, transformPoint } from "./scaleStrokes";

export const drawStrokesOnCanvas = (
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  strokes: Stroke[],
  shouldScale: boolean = false,
) => {
  const dpr = window.devicePixelRatio || 1;
  const logicalWidth = canvas.width / dpr;
  const logicalHeight = canvas.height / dpr;

  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, logicalWidth, logicalHeight);

  if (strokes.length === 0) return;

  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const scaleInfo = shouldScale
    ? calculateStrokeScale(strokes, logicalWidth, logicalHeight)
    : null;

  for (const stroke of strokes) {
    const [xPoints, yPoints] = stroke.points;
    const [r, g, b] = stroke.color;

    ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.beginPath();

    if (xPoints.length === 0) continue;

    if (shouldScale && scaleInfo) {
      const { scale, offsetX, offsetY } = scaleInfo;
      const start = transformPoint(
        xPoints[0],
        yPoints[0],
        scale,
        offsetX,
        offsetY,
      );
      ctx.moveTo(start.x, start.y);
      for (let i = 1; i < xPoints.length; i++) {
        const pt = transformPoint(
          xPoints[i],
          yPoints[i],
          scale,
          offsetX,
          offsetY,
        );
        ctx.lineTo(pt.x, pt.y);
      }
    } else {
      ctx.moveTo(xPoints[0], yPoints[0]);
      for (let i = 1; i < xPoints.length; i++) {
        ctx.lineTo(xPoints[i], yPoints[i]);
      }
    }

    ctx.stroke();
  }
};
