import type { Point, Stroke } from '@/entities/similarity/model';
// -----convex hull 계산 관련 유틸-----

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

export const hullArea = (hull: Point[]): number => {
  if (hull.length < 3) return 0;

  let area = 0;
  for (let i = 0; i < hull.length; i++) {
    const j = (i + 1) % hull.length;
    area += hull[i].x * hull[j].y;
    area -= hull[j].x * hull[i].y;
  }

  return Math.abs(area) / 2;
};

export const hullPerimeter = (hull: Point[]): number => {
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

// 형태 유사도 지표 1
// convex hull 둘레 + 넓이
export const getConvexHull = (points: Point[]): Point[] => {
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
