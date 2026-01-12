import type { Point, Stroke } from '@/entities/similarity';
import { cosineSimilarity, getRelativeSimilarity } from '../../utils/math';
import {
  getConvexHull,
  hullArea,
  hullPerimeter,
  strokesToPoints,
} from '../convexHullGeometry';
import { getRadialSignature } from '../radialSignature';

export const calculateShapeSimilarity = (
  strokes1: Stroke[],
  strokes2: Stroke[],
): number => {
  // 1. Stroke를 Point로 변환
  const points1 = strokesToPoints(strokes1);
  const points2 = strokesToPoints(strokes2);

  // 2. Convex Hull 계산
  const hull1 = getConvexHull(points1);
  const hull2 = getConvexHull(points2);

  // 3. 면적과 둘레 계산
  const area1 = hullArea(hull1);
  const area2 = hullArea(hull2);
  const perimeter1 = hullPerimeter(hull1);
  const perimeter2 = hullPerimeter(hull2);

  // 4. hull 기반 형태 유사도 계산
  const areaSim = calculateAreaSimilarity(area1, area2);
  const perimeterSim = calculatePerimeterSimilarity(perimeter1, perimeter2);
  const hullSim = areaSim * 0.5 + perimeterSim * 0.5;

  // 5. 각도 기반 형태 유사도 계산
  const radialSim = calculateRadialSimilarity(points1, points2);

  const shapeSim = (hullSim * 0.5 + radialSim * 0.5) * 100;

  return shapeSim;
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

// -----radial signature 기반 유사도 계산 유틸-----
const calculateRadialSimilarity = (
  points1: Point[],
  points2: Point[],
): number => {
  const radSig1 = getRadialSignature(points1);
  const radSig2 = getRadialSignature(points2);
  const cosSim = cosineSimilarity(radSig1, radSig2);
  return Math.max(0, Math.min(1, cosSim));
};
