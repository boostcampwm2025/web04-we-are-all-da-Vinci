import type { Stroke } from '@/entities/drawing/model/types';
import { getStrokeBoundingBox, getStrokeLength } from './geometry';

/**
 * 두 stroke의 유사도 계산
 * @param {Array} stroke1 - [x[], y[]]
 * @param {Array} stroke2 - [x[], y[]]
 * @returns {number} - 유사도 (0~100)
 */
export const compareStrokes = (stroke1: Stroke, stroke2: Stroke) => {
  // 1. 길이 유사도
  const len1 = getStrokeLength(stroke1);
  const len2 = getStrokeLength(stroke2);
  const lengthSimilarity =
    1 - Math.abs(len1 - len2) / Math.max(len1, len2, 0.01);

  // 2. 방향 유사도
  const dir1 = getStrokeDirection(stroke1);
  const dir2 = getStrokeDirection(stroke2);
  let dirDiff = Math.abs(dir1 - dir2);
  if (dirDiff > Math.PI) dirDiff = 2 * Math.PI - dirDiff; // 각도 정규화
  const directionSimilarity = 1 - dirDiff / Math.PI;

  // 3. 위치 유사도
  const positionSimilarity = getPositionSimilarity(stroke1, stroke2);

  // 가중 평균
  const similarity =
    lengthSimilarity * 0.3 +
    directionSimilarity * 0.4 +
    positionSimilarity * 0.3;

  return similarity * 100;
};

/**
 * 개선된 방향 유사도 - 전체 세그먼트의 평균 방향 사용
 */
const getStrokeDirection = (stroke: Stroke) => {
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
 * 위치 유사도 - 바운딩 박스 기반 상대 위치 비교
 */
const getPositionSimilarity = (stroke1: Stroke, stroke2: Stroke) => {
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
