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
};
