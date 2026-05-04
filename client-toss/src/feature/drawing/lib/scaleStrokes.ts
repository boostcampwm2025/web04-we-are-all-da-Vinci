import type { Stroke } from "@toss/shared";

interface ScaleResult {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export const calculateStrokeScale = (
  strokes: Stroke[],
  canvasWidth: number,
  canvasHeight: number,
  padding: number = 20,
): ScaleResult => {
  const bounds = strokes.reduce(
    (acc, stroke) => {
      const [xPoints, yPoints] = stroke.points;
      return {
        minX: Math.min(acc.minX, ...xPoints),
        maxX: Math.max(acc.maxX, ...xPoints),
        minY: Math.min(acc.minY, ...yPoints),
        maxY: Math.max(acc.maxY, ...yPoints),
      };
    },
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
  );

  if (bounds.minX === Infinity || bounds.minY === Infinity) {
    return { scale: 1, offsetX: 0, offsetY: 0 };
  }

  const originalWidth = bounds.maxX - bounds.minX;
  const originalHeight = bounds.maxY - bounds.minY;

  if (originalWidth === 0 && originalHeight === 0) {
    return {
      scale: 1,
      offsetX: canvasWidth / 2 - bounds.minX,
      offsetY: canvasHeight / 2 - bounds.minY,
    };
  }

  const availableWidth = canvasWidth - padding * 2;
  const availableHeight = canvasHeight - padding * 2;

  const scaleX = originalWidth === 0 ? availableHeight / 1 : availableWidth / originalWidth;
  const scaleY = originalHeight === 0 ? availableWidth / 1 : availableHeight / originalHeight;
  const scale = Math.min(scaleX, scaleY);

  const scaledWidth = originalWidth * scale;
  const scaledHeight = originalHeight * scale;
  const offsetX = (canvasWidth - scaledWidth) / 2 - bounds.minX * scale;
  const offsetY = (canvasHeight - scaledHeight) / 2 - bounds.minY * scale;

  return { scale, offsetX, offsetY };
};

export const transformPoint = (
  x: number,
  y: number,
  scale: number,
  offsetX: number,
  offsetY: number,
): { x: number; y: number } => ({
  x: x * scale + offsetX,
  y: y * scale + offsetY,
});
