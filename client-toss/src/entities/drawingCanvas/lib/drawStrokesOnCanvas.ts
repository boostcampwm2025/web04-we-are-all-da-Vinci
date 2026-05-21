import type { Stroke } from "@toss/shared";
import { getCanvasBackgroundColor } from "./canvasBackground";
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

  ctx.fillStyle = getCanvasBackgroundColor();
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
    const color = `rgb(${r}, ${g}, ${b})`;

    if (xPoints.length === 0) continue;

    const transform = (i: number) =>
      shouldScale && scaleInfo
        ? transformPoint(
            xPoints[i],
            yPoints[i],
            scaleInfo.scale,
            scaleInfo.offsetX,
            scaleInfo.offsetY,
          )
        : { x: xPoints[i], y: yPoints[i] };

    if (xPoints.length === 1) {
      const { x, y } = transform(0);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }

    ctx.strokeStyle = color;
    ctx.beginPath();
    const start = transform(0);
    ctx.moveTo(start.x, start.y);
    for (let i = 1; i < xPoints.length; i++) {
      const pt = transform(i);
      ctx.lineTo(pt.x, pt.y);
    }
    ctx.stroke();
  }
};
