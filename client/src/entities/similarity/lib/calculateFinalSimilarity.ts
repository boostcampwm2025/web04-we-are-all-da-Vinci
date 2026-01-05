import type { Stroke } from '@/entities/similarity/model';
import { normalizeStrokes } from './normalizeStrokes';
import { calculateGreedyStrokeMatchScore } from './calculateGreedyStrokeMatchScore';
import { calculateHullSimilarity } from './convexHall';

export const calculateFinalSimilarity = (
  promptStrokes: Stroke[], // 제시 그림 스트로크
  strokes: Stroke[], // 사용자 그림 스트로크
) => {
  const normalizedPromptStrokes = normalizeStrokes(promptStrokes);
  const normalizedStrokes = normalizeStrokes(strokes);

  // 스트로크 개수 비교
  const strokeCountSimilarity =
    normalizedStrokes.length === 0
      ? 0
      : Math.max(
          0,
          100 -
            Math.abs(
              normalizedPromptStrokes.length - normalizedStrokes.length,
            ) *
              10,
        );

  // 스트로크 유사도
  const strokeMatchSimilarity = calculateGreedyStrokeMatchScore(
    normalizedPromptStrokes,
    normalizedStrokes,
  );

  // hull 기반 유사도
  const hullScore = calculateHullSimilarity(
    normalizedPromptStrokes,
    normalizedStrokes,
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
