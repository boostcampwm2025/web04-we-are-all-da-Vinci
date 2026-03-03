import type { Point } from '@/entities/similarity';
import type { Stroke } from '@shared/types';
import { pathLength } from './math';

// Strokes -> Points 변환
export const strokesToPoints = (strokes: Stroke[]): Point[] => {
  const points: Point[] = [];

  for (const stroke of strokes) {
    const [xs, ys] = stroke.points;
    for (let i = 0; i < xs.length; i++) {
      points.push({ x: xs[i], y: ys[i] });
    }
  }
  return points;
};

// ---------Stroke 측정-----------
export const getStrokeLength = (stroke: Stroke): number => {
  const [xArr, yArr] = stroke.points;
  return pathLength(xArr, yArr);
};

export const getTotalLength = (strokes: Stroke[]): number => {
  let total = 0;
  for (const stroke of strokes) {
    total += getStrokeLength(stroke);
  }
  return total;
};

export const getStrokeCenter = (stroke: Stroke): Point => {
  const [xArr, yArr] = stroke.points;
  const avgX = xArr.reduce((sum, x) => sum + x, 0) / xArr.length;
  const avgY = yArr.reduce((sum, y) => sum + y, 0) / yArr.length;
  return { x: avgX, y: avgY };
};

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

export const getStrokeDirection = (stroke: Stroke): number => {
  const [xArr, yArr] = stroke.points;
  if (xArr.length < 2) return 0;

  let sumDx = 0,
    sumDy = 0;
  let totalWeight = 0;

  for (let i = 1; i < xArr.length; i++) {
    const dx = xArr[i] - xArr[i - 1];
    const dy = yArr[i] - yArr[i - 1];
    const length = Math.sqrt(dx * dx + dy * dy);

    sumDx += dx * length;
    sumDy += dy * length;
    totalWeight += length;
  }

  if (totalWeight === 0) return 0;

  return Math.atan2(sumDy / totalWeight, sumDx / totalWeight);
};

// ---------Hull 측정-----------
export const buildConvexHull = (points: Point[]): Point[] => {
  points.sort(function (a, b) {
    return a.x != b.x ? a.x - b.x : a.y - b.y;
  });

  const n = points.length;
  const hull = [];

  for (let i = 0; i < 2 * n; i++) {
    const j = i < n ? i : 2 * n - 1 - i;

    while (
      hull.length >= 2 &&
      removeMiddle(hull[hull.length - 2], hull[hull.length - 1], points[j])
    ) {
      hull.pop();
    }
    hull.push(points[j]);
  }

  hull.pop();
  return hull;
};

const removeMiddle = (a: Point, b: Point, c: Point): boolean => {
  const cross = (a.x - b.x) * (c.y - b.y) - (a.y - b.y) * (c.x - b.x);
  const dot = (a.x - b.x) * (c.x - b.x) + (a.y - b.y) * (c.y - b.y);
  return cross < 0 || (cross == 0 && dot <= 0);
};

export const getHullArea = (hull: Point[]): number => {
  if (hull.length < 3) return 0;

  let area = 0;
  for (let i = 0; i < hull.length; i++) {
    const j = (i + 1) % hull.length;
    area += hull[i].x * hull[j].y;
    area -= hull[j].x * hull[i].y;
  }

  return Math.abs(area) / 2;
};

export const getHullPerimeter = (hull: Point[]): number => {
  if (hull.length < 2) return 0;

  let length = 0;
  for (let i = 0; i < hull.length; i++) {
    const j = (i + 1) % hull.length;
    const dx = hull[i].x - hull[j].x;
    const dy = hull[i].y - hull[j].y;
    length += Math.sqrt(dx * dx + dy * dy);
  }

  return length;
};

// ---------Radial Signature 측정-----------
const getCentroid = (points: Point[]): Point => {
  let sumX = 0,
    sumY = 0;
  for (const point of points) {
    sumX += point.x;
    sumY += point.y;
  }
  const n = Math.max(1, points.length);
  return { x: sumX / n, y: sumY / n };
};

export const buildRadialSignature = (
  points: Point[],
  binning: number = 72,
  smoothWindow: number = 3,
) => {
  // binning: 각도 구간화 (0~360, 숫자 클수록 세세함)
  if (points.length === 0) return Array(binning).fill(0);

  const centroid = getCentroid(points);
  const maxRadialSignatures = Array(binning).fill(0);

  for (const point of points) {
    const dx = point.x - centroid.x;
    const dy = point.y - centroid.y;
    const centroidDist = Math.hypot(dx, dy);
    let centroidAng = Math.atan2(dy, dx); // [-pi, pi]
    if (centroidAng < 0) centroidAng += Math.PI * 2; // [0, 2pi)

    const binningIdx = Math.min(
      binning - 1,
      Math.floor((centroidAng / (Math.PI * 2)) * binning),
    );

    // 해당 각도에서 최대 거리 사용
    if (centroidDist > maxRadialSignatures[binningIdx])
      maxRadialSignatures[binningIdx] = centroidDist;
  }

  // smoothing(이동평균): 각도별 값의 노이즈 줄이기
  // smooth window 크기만큼의 좌우 이웃 값 + 자기자신의 평균값 사용
  if (smoothWindow <= 1) return maxRadialSignatures;
  const half = Math.floor(smoothWindow / 2);
  const smoothed = Array(binning).fill(0);
  for (let i = 0; i < binning; i++) {
    let sum = 0;
    let cnt = 0;
    for (let k = -half; k <= half; k++) {
      const j = (i + k + binning) % binning;
      sum += maxRadialSignatures[j];
      cnt++;
    }
    smoothed[i] = sum / cnt;
  }
  return smoothed;
};
