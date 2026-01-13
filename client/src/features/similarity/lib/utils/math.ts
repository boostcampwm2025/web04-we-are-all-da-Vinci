// 두 점수 간 비율 기반 상대 유사도 계산
export const getRelativeSimilarity = (a: number, b: number): number => {
  return 1 - Math.abs(a - b) / Math.max(a, b, 0.01);
};

// 두 점 간 유클리드 거리 계산
export const getEuclideanDistance = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.hypot(dx, dy);
};

// 여러 점들 간 총 경로 길이 계산
export const getPathLength = (xArr: number[], yArr: number[]): number => {
  let length = 0;

  for (let i = 1; i < xArr.length; i++) {
    length += getEuclideanDistance(xArr[i - 1], yArr[i - 1], xArr[i], yArr[i]);
  }

  return length;
};

// 코사인 유사도
export const cosineSimilarity = (vec1: number[], vec2: number[]): number => {
  let dot = 0,
    n1 = 0,
    n2 = 0;
  const n = Math.min(vec1.length, vec2.length);
  for (let i = 0; i < n; i++) {
    dot += vec1[i] * vec2[i];
    n1 += vec1[i] * vec1[i];
    n2 += vec2[i] * vec2[i];
  }
  if (n1 <= 1e-12 || n2 <= 1e-12) return 0;
  return dot / (Math.sqrt(n1) * Math.sqrt(n2));
};
