import type { Stroke } from "@toss/shared";

export const drawStrokesOnCanvas = (
  canvas: HTMLCanvasElement,
  strokes: Stroke[],
) => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  strokes.forEach((stroke) => {
    const [xPoints, yPoints] = stroke.points;
    const [r, g, b] = stroke.color;

    ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
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
