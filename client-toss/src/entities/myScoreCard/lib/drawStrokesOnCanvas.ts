import type { Stroke } from "@toss/shared";

const NORMALIZE_SIZE = 500;

export const drawStrokesOnCanvas = (
  canvas: HTMLCanvasElement,
  strokes: Stroke[],
) => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const scale = canvas.width / NORMALIZE_SIZE;

  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  strokes.forEach((stroke) => {
    const [xPoints, yPoints] = stroke.points;
    const [r, g, b] = stroke.color;

    ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.lineWidth = 4 * scale;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();

    if (xPoints.length > 0) {
      ctx.moveTo(xPoints[0] * scale, yPoints[0] * scale);
      for (let i = 1; i < xPoints.length; i++) {
        ctx.lineTo(xPoints[i] * scale, yPoints[i] * scale);
      }
    }
    ctx.stroke();
  });
};
