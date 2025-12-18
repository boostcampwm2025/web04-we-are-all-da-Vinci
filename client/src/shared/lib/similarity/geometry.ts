import type { Stroke } from '@/entities/drawing/model/types';

/**
 * Stroke의 전체 길이 계산
 * @param {Array} stroke - [x[], y[]]
 * @returns {number} - 총 길이
 */
const getStrokeLength = (stroke: Stroke) => {
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
 * 개선된 방향 유사도 - 전체 세그먼트의 평균 방향 사용
 */
const getImprovedStrokeDirection = (stroke: Stroke) => {
  const [xArr, yArr] = stroke;
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

/**
 * Stroke의 중심점 계산
 * @param {Array} stroke - [x[], y[]]
 * @returns {Object} - {x, y}
 */
const getStrokeCenter = (stroke: Stroke) => {
  const [xArr, yArr] = stroke;
  const avgX = xArr.reduce((sum, x) => sum + x, 0) / xArr.length;
  const avgY = yArr.reduce((sum, y) => sum + y, 0) / yArr.length;
  return { x: avgX, y: avgY };
};

/**
 * 개선된 위치 유사도 - 바운딩 박스 기반 상대 위치 비교
 */
const getImprovedPositionSimilarity = (stroke1: Stroke, stroke2: Stroke) => {
  // 각 스트로크의 바운딩 박스
  const bbox1 = getStrokeBoundingBox(stroke1);
  const bbox2 = getStrokeBoundingBox(stroke2);

  // 1. 중심점 거리
  const centerDist = Math.sqrt(
    (bbox1.centerX - bbox2.centerX) ** 2 + (bbox1.centerY - bbox2.centerY) ** 2,
  );
  const centerSim = Math.max(0, 1 - centerDist / 1.0);

  // 2. 크기 유사도 (너비와 높이)
  const widthSim =
    1 -
    Math.abs(bbox1.width - bbox2.width) /
      Math.max(bbox1.width, bbox2.width, 0.01);
  const heightSim =
    1 -
    Math.abs(bbox1.height - bbox2.height) /
      Math.max(bbox1.height, bbox2.height, 0.01);
  const sizeSim = (widthSim + heightSim) / 2;

  // 중심 위치(60%) + 크기(40%)
  return centerSim * 0.6 + sizeSim * 0.4;
};

const getStrokeBoundingBox = (stroke: Stroke) => {
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
