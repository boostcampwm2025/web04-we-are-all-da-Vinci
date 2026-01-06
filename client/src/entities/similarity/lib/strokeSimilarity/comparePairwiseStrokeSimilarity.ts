import type { Stroke } from '@/entities/similarity/model';
import {
  getStrokeBoundingBox,
  getStrokeDirection,
  getStrokeLength,
} from '../geometry/strokeGeometry';
import {
  getEuclideanDistance,
  getRelativeSimilarity,
} from '../utils/mathUtils';

// 두 스트로크를 일대일로 비교
export const comparePairwiseStrokeSimilarity = (
  stroke1: Stroke,
  stroke2: Stroke,
): number => {
  const lengthSimilarity = getLengthSimilarity(stroke1, stroke2);
  const directionSimilarity = getDirectionSimilarity(stroke1, stroke2);
  const positionSimilarity = getPositionSimilarity(stroke1, stroke2);

  // 가중 평균
  const similarity =
    lengthSimilarity * 0.3 +
    directionSimilarity * 0.4 +
    positionSimilarity * 0.3;

  return similarity * 100;
};

// 길이 유사도: 두 스트로크의 길이가 얼마나 비슷한가
const getLengthSimilarity = (stroke1: Stroke, stroke2: Stroke): number => {
  const len1 = getStrokeLength(stroke1);
  const len2 = getStrokeLength(stroke2);
  return getRelativeSimilarity(len1, len2);
};

// 방향 유사도: 두 스트로크의 가중평균방향이 얼마나 비슷한가
const getDirectionSimilarity = (stroke1: Stroke, stroke2: Stroke): number => {
  const dir1 = getStrokeDirection(stroke1);
  const dir2 = getStrokeDirection(stroke2);
  let dirDiff = Math.abs(dir1 - dir2);
  if (dirDiff > Math.PI) dirDiff = 2 * Math.PI - dirDiff; // 각도 정규화
  return 1 - dirDiff / Math.PI;
};

// 위치 유사도: 두 스트로크의 상대위치가 얼마나 비슷한가
const getPositionSimilarity = (stroke1: Stroke, stroke2: Stroke): number => {
  // 각 스트로크의 바운딩 박스
  const bbox1 = getStrokeBoundingBox(stroke1);
  const bbox2 = getStrokeBoundingBox(stroke2);

  // 1. 중심점 거리
  const centerDist = getEuclideanDistance(
    bbox2.centerX,
    bbox2.centerY,
    bbox1.centerX,
    bbox1.centerY,
  );
  const centerSim = Math.max(0, 1 - centerDist / 1.0);

  // 2. 크기 유사도 (너비와 높이)
  const widthSim = getRelativeSimilarity(bbox1.width, bbox2.width);
  const heightSim = getRelativeSimilarity(bbox1.height, bbox2.height);
  const sizeSim = (widthSim + heightSim) / 2;

  // 중심 위치(60%) + 크기(40%)
  return centerSim * 0.6 + sizeSim * 0.4;
};
