import type { Stroke } from '@/entities/similarity';
import { getRelativeSimilarity } from '../../utils/math';
import {
  convexHull,
  hullArea,
  hullPerimeter,
  strokesToPoints,
} from '../convexHullGeometry';

export const calculateHullSimilarity = (
  strokes1: Stroke[],
  strokes2: Stroke[],
): number => {
  // 1. Stroke를 Point로 변환
  const points1 = strokesToPoints(strokes1);
  const points2 = strokesToPoints(strokes2);

  // 2. Convex Hull 계산
  const hull1 = convexHull(points1);
  const hull2 = convexHull(points2);

  // 3. 면적과 둘레 계산
  const area1 = hullArea(hull1);
  const area2 = hullArea(hull2);
  const perimeter1 = hullPerimeter(hull1);
  const perimeter2 = hullPerimeter(hull2);

  // 4. 유사도 계산
  const areaSim = calculateAreaSimilarity(area1, area2);
  const perimeterSim = calculatePerimeterSimilarity(perimeter1, perimeter2);

  // 5. Hull 점수 (면적 50% + 둘레 50%)
  const hullScore = (areaSim * 0.5 + perimeterSim * 0.5) * 100;

  return hullScore;
};

// -----convex hall 면적/둘레 유사도 계산 유틸------

const calculateAreaSimilarity = (area1: number, area2: number): number => {
  if (area1 === 0 && area2 === 0) return 1;
  if (area1 === 0 || area2 === 0) return 0;

  return getRelativeSimilarity(area1, area2);
};

const calculatePerimeterSimilarity = (p1: number, p2: number): number => {
  if (p1 === 0 && p2 === 0) return 1;
  if (p1 === 0 || p2 === 0) return 0;

  return getRelativeSimilarity(p1, p2);
};
