import type { Point, Stroke } from '@/entities/similarity/model';

// 스트로크 길이
export const getStrokeLength = (stroke: Stroke): number => {
  const [xArr, yArr] = stroke.points;
  let length = 0;

  for (let i = 1; i < xArr.length; i++) {
    const dx = xArr[i] - xArr[i - 1];
    const dy = yArr[i] - yArr[i - 1];
    length += Math.sqrt(dx * dx + dy * dy);
  }

  return length;
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
