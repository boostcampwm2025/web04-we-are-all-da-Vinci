import type { Point, Stroke } from '@/entities/similarity/model';
import { getPathLength } from './math';

// 스트로크 길이
export const getStrokeLength = (stroke: Stroke): number => {
  const [xArr, yArr] = stroke.points;
  return getPathLength(xArr, yArr);
};

// 스트로크 중심점
export const getStrokeCenter = (stroke: Stroke): Point => {
  const [xArr, yArr] = stroke.points;
  const avgX = xArr.reduce((sum, x) => sum + x, 0) / xArr.length;
  const avgY = yArr.reduce((sum, y) => sum + y, 0) / yArr.length;
  return { x: avgX, y: avgY };
};

// 스트로크의 바운딩 박스 (이 스트로크를 포함하는 직사각형)
export const getStrokeBoundingBox = (stroke: Stroke) => {
  const [xArr, yArr] = stroke.points;

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

// 전체 세그먼트의 평균 방향
export const getStrokeDirection = (stroke: Stroke): number => {
  const [xArr, yArr] = stroke.points;
  if (xArr.length < 2) return 0;

  let sumDx = 0,
    sumDy = 0;
  let totalWeight = 0;

  // 각 세그먼트의 방향 벡터를 길이로 가중 평균
  for (let i = 1; i < xArr.length; i++) {
    const dx = xArr[i] - xArr[i - 1];
    const dy = yArr[i] - yArr[i - 1];
    const length = Math.sqrt(dx * dx + dy * dy);

    sumDx += dx * length;
    sumDy += dy * length;
    totalWeight += length;
  }

  if (totalWeight === 0) return 0;

  // 가중 평균된 방향
  return Math.atan2(sumDy / totalWeight, sumDx / totalWeight);
};
