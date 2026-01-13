import type { Color } from '@/entities/similarity';

// RGB 벡터 유클리드 거리 사용해 유사도 계산
export const calculateColorSimilarity = (
  c1: Color,
  c2: Color,
  gamma = 2.5, // 민감도 threshold 사용: 추후 컬러 확장 가능성 대비
): number => {
  const dr = c1[0] - c2[0];
  const dg = c1[1] - c2[1];
  const db = c1[2] - c2[2];
  const d = Math.hypot(dr, dg, db); // 0 ~ 441.67
  const dMax = Math.sqrt(3 * 255 * 255);
  const x = d / dMax; // 0~1

  const sim = Math.pow(1 - x, gamma); // 차이가 작을수록 점수 높음
  return Math.max(0, Math.min(1, sim));
};
