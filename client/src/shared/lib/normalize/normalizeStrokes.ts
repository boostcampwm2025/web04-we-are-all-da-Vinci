import type { Stroke } from '@/entities/drawing/model/types';

/**
 * Stroke를 정규화 (0~1 범위로)
 * @param {Array} strokes - [[x[], y[]], ...]
 * @returns {Array} - 정규화된 strokes
 */
export const normalizeStrokes = (strokes: Stroke[]): Stroke[] => {
  if (strokes.length === 0) return [];

  // 모든 점의 min/max 찾기
  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;

  for (const stroke of strokes) {
    const [xArr, yArr] = stroke;
    for (const x of xArr) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
    }
    for (const y of yArr) {
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }

  const width = maxX - minX || 1;
  const height = maxY - minY || 1;
  const scale = Math.max(width, height);

  // 정규화 (0~1 범위, 중앙 기준)
  const normalized = strokes.map((stroke): Stroke => {
    const [xArr, yArr] = stroke;
    const normalizedX = xArr.map((x) => (x - minX) / scale);
    const normalizedY = yArr.map((y) => (y - minY) / scale);
    return [normalizedX, normalizedY];
  });

  return normalized;
};
