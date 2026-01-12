import type { Point } from '@/entities/similarity';

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

// 형태 유사도 지표 2
// 중심점으로부터의 각도별로 외곽선 형태를 표현한 1차원 배열을 만드는 함수
export const getRadialSignature = (points: Point[], binning: number = 72) => {
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
      Math.floor(centroidAng / (Math.PI * 2)) * binning,
    );

    // 해당 각도에서 최대 거리 사용
    if (centroidDist > maxRadialSignatures[binningIdx])
      maxRadialSignatures[binningIdx] = centroidDist;
  }

  return maxRadialSignatures;
};
