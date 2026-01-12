import type { Stroke } from '@/entities/similarity/model';
import { calculateGreedyStrokeMatchScore } from './stroke/strokeSimilarity/calculateGreedyStrokeMatchScore';
import { calculateHullSimilarity } from './hull/hullSimilarity/calculateHullSimilarity';

export const calculateFinalSimilarity = (
  promptStrokes: Stroke[], // 제시 그림 스트로크
  playerStrokes: Stroke[], // 사용자 그림 스트로크
) => {
  if (playerStrokes.length === 0) return { similarity: 0 };

  const validPromptStrokes = getValidStrokes(promptStrokes);
  const validPlayerStrokes = getValidStrokes(playerStrokes);

  const normalizedPromptStrokes = normalizeStrokes(validPromptStrokes);
  const normalizedPlayerStrokes = normalizeStrokes(validPlayerStrokes);

  // 스트로크 개수 비교
  const strokeCountSimilarity = calculateStrokeCountSimilarity(
    normalizedPromptStrokes,
    normalizedPlayerStrokes,
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

  const scaledHull = applyNonLinearScale(hullScore, 90);
  let weights;

  const promptStrokeCount = normalizedPromptStrokes.length;
  const playerStrokeCount = normalizedPlayerStrokes.length;
  const strokeCountDifference = promptStrokeCount - playerStrokeCount;
  if (strokeCountDifference > 0) {
    // 스트로크 개수가 더 적을 때: 선 유사도에 가중치
    weights = {
      strokeCount: 0.1,
      strokeMatch: 0.6,
      hull: 0.3,
    };
  } else if (strokeCountDifference === 0) {
    // 스트로크 개수가 같을 때
    weights = {
      strokeCount: 0.15,
      strokeMatch: 0.35,
      hull: 0.5,
    };
  } else {
    // 스트로크 개수가 더 많을 때: 형태 유사도에 가중치
    weights = {
      strokeCount: 0.1,
      strokeMatch: 0.3,
      hull: 0.6,
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

// 일정 길이 이상의 스트로크만 남김
const getValidStrokes = (strokes: Stroke[]): Stroke[] => {
  const MIN_STROKE_LENGTH = 10; // 최소 길이 임계값
  return strokes.filter((stroke) => {
    const [xs, ys] = stroke.points;
    let length = 0;
    for (let i = 1; i < xs.length; i++) {
      const dx = xs[i] - xs[i - 1];
      const dy = ys[i] - ys[i - 1];
      length += Math.sqrt(dx * dx + dy * dy);
    }
    return length >= MIN_STROKE_LENGTH;
  });
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

// 스트로크 개수 유사도 점수
const calculateStrokeCountSimilarity = (
  strokes1: Stroke[],
  strokes2: Stroke[],
) => {
  const strokeCount1 = strokes1.length;
  const strokeCount2 = strokes2.length;
  if (strokeCount1 === 0 && strokeCount2 === 0) return 100;
  if (strokeCount1 === 0 || strokeCount2 === 0) return 0;

  const ratio =
    Math.min(strokeCount1, strokeCount2) / Math.max(strokeCount1, strokeCount2);
  return ratio * 100;
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
    return score;
  }
};
