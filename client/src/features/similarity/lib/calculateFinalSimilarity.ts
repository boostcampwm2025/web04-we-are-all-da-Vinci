import type { Stroke } from '@/entities/similarity/model';
import { calculateGreedyStrokeMatchScore } from './stroke/strokeSimilarity/calculateGreedyStrokeMatchScore';
import { calculateHullSimilarity } from './hull/hullSimilarity/calculateHullSimilarity';

export const calculateFinalSimilarity = (
  promptStrokes: Stroke[], // 제시 그림 스트로크
  playerStrokes: Stroke[], // 사용자 그림 스트로크
) => {
  const normalizedPromptStrokes = normalizeStrokes(promptStrokes);
  const normalizedPlayerStrokes = normalizeStrokes(playerStrokes);

  // 스트로크 개수 비교
  const strokeCountSimilarity =
    normalizedPlayerStrokes.length === 0
      ? 0
      : Math.max(
          0,
          100 -
            Math.abs(
              normalizedPromptStrokes.length - normalizedPlayerStrokes.length,
            ) *
              10,
        );

  // 스트로크 유사도
  const strokeMatchSimilarity = calculateGreedyStrokeMatchScore(
    normalizedPromptStrokes,
    normalizedPlayerStrokes,
  );

  // hull 기반 유사도
  const hullScore = calculateHullSimilarity(
    normalizedPromptStrokes,
    normalizedPlayerStrokes,
  );

  const scaledHull = applyNonLinearScale(hullScore);
  let weights;

  if (scaledHull >= 92) {
    // Hull 높음 -> 형태 중심 평가
    weights = {
      strokeCount: 0.05,
      strokeMatch: 0.15, // 비중 감소
      hull: 0.8, // Hull 비중 증가
    };
  } else if (scaledHull >= 60) {
    // Hull 중간 -> 균형
    weights = {
      strokeCount: 0.08,
      strokeMatch: 0.32,
      hull: 0.6,
    };
  } else {
    // Hull 낮음 -> Stroke를 더 중요하게 봄
    weights = {
      strokeCount: 0.1,
      strokeMatch: 0.5,
      hull: 0.4,
    };
  }

  // 최종 유사도 계산
  const similarity =
    strokeCountSimilarity * weights.strokeCount +
    strokeMatchSimilarity * weights.strokeMatch +
    scaledHull * weights.hull;

  const roundedSimilarity = Math.round(similarity * 100) / 100;

  return {
    similarity: roundedSimilarity,
  };
};

// 스트로크 정규화
const normalizeStrokes = (strokes: Stroke[]): Stroke[] => {
  if (strokes.length === 0) return [];

  // 모든 점의 min/max 찾기
  let minX = Infinity,
    maxX = -Infinity;
  let minY = Infinity,
    maxY = -Infinity;

  for (const stroke of strokes) {
    const [xArr, yArr] = stroke.points;
    for (const x of xArr) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
    }
    for (const y of yArr) {
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }

  const width = maxX - minX || 1;
  const height = maxY - minY || 1;
  const scale = Math.max(width, height);

  // 정규화 (0~1 범위, 중앙 기준)
  const normalized = strokes.map((stroke): Stroke => {
    const [xArr, yArr] = stroke.points;
    const normalizedX = xArr.map((x) => (x - minX) / scale);
    const normalizedY = yArr.map((y) => (y - minY) / scale);
    return { points: [normalizedX, normalizedY], color: stroke.color };
  });

  return normalized;
};

// 점수 비선형 스케일링
const applyNonLinearScale = (
  score: number,
  threshold = 70,
  steepness = 2,
): number => {
  // threshold 기준으로 낮은 점수는 더 낮게, 높은 점수는 더 높게
  if (score < threshold) {
    // 낮은 점수는 제곱으로 더 낮춤
    return Math.pow(score / 100, steepness) * 100;
  } else {
    // 높은 점수는 유지하되 약간만 강조
    const normalized = (score - threshold) / (100 - threshold);
    return threshold + normalized * (100 - threshold);
  }
};
