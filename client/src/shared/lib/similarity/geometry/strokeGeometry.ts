import type { Stroke } from '@/entities/drawing/model/types';

// Stroke의 전체 길이 계산
export const getStrokeLength = (stroke: Stroke): number => {
  const [xArr, yArr] = stroke;
  let length = 0;

  for (let i = 1; i < xArr.length; i++) {
    const dx = xArr[i] - xArr[i - 1];
    const dy = yArr[i] - yArr[i - 1];
    length += Math.sqrt(dx * dx + dy * dy);
  }

  return length;
};

/**
 * Stroke의 중심점 계산
 * @param {Array} stroke - [x[], y[]]
 * @returns {Object} - {x, y}
 */
export const getStrokeCenter = (stroke: Stroke) => {
  const [xArr, yArr] = stroke;
  const avgX = xArr.reduce((sum, x) => sum + x, 0) / xArr.length;
  const avgY = yArr.reduce((sum, y) => sum + y, 0) / yArr.length;
  return { x: avgX, y: avgY };
};

export const getStrokeBoundingBox = (stroke: Stroke) => {
  const [xArr, yArr] = stroke;

  const minX = Math.min(...xArr);
  const maxX = Math.max(...xArr);
  const minY = Math.min(...yArr);
  const maxY = Math.max(...yArr);

  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };
};
