import type { Similarity, Stroke } from '@shared/types';
import type { PreprocessedStrokeData } from '../model/preprocessedStrokeData';
import { SIMILARITY_CONFIG } from '../config/similarityConfig';
import {
  buildConvexHull,
  buildRadialSignature,
  getHullArea,
  getHullPerimeter,
  strokesToPoints,
} from './geometry';
import { scoreGreedyStrokeMatch } from './stroke.sim';
import { scoreShapeSimilarity } from './shape.sim';
import { scoreDensityBiasPenalty, scoreInkLengthPenalty } from './penalty';

// 스트로크에서 유사도 계산에 필요한 수학적 데이터를 미리 계산하는 함수
export const preprocessStrokes = (
  strokes: Stroke[],
): PreprocessedStrokeData => {
  const validStrokes = getValidStrokes(strokes);
  const normalizedStrokes = normalizeStrokes(validStrokes);
  const points = strokesToPoints(normalizedStrokes);
  const hull = buildConvexHull(points);
  const hullArea = getHullArea(hull);
  const hullPerimeter = getHullPerimeter(hull);
  const radialSignature = buildRadialSignature(points);

  return {
    normalizedStrokes,
    strokeCount: normalizedStrokes.length,
    points,
    hull,
    hullArea,
    hullPerimeter,
    radialSignature,
  };
};

export const scoreFinalSimilarity = (
  preprocessedPrompt: PreprocessedStrokeData,
  preprocessedPlayer: PreprocessedStrokeData,
): Similarity => {
  const normalizedPromptStrokes = preprocessedPrompt.normalizedStrokes;
  const normalizedPlayerStrokes = preprocessedPlayer.normalizedStrokes;

  // 스트로크 개수 비교
  const strokeCountSimilarity = scoreStrokeCountSimilarity(
    normalizedPromptStrokes,
    normalizedPlayerStrokes,
  );

  // 스트로크 유사도
  const strokeMatchSimilarity = scoreGreedyStrokeMatch(
    normalizedPromptStrokes,
    normalizedPlayerStrokes,
  );

  // 형태 유사도
  const shapeScore = scoreShapeSimilarity(
    preprocessedPrompt,
    preprocessedPlayer,
  );

  const scaledShapeScore = applyNonLinearScale(shapeScore, 90);

  // 최종 유사도 계산
  const weightedStrokeCountSim =
    strokeCountSimilarity * SIMILARITY_CONFIG.finalWeights.strokeCount;
  const weightedStrokeMatchSim =
    strokeMatchSimilarity.score * SIMILARITY_CONFIG.finalWeights.strokeMatch;
  const weightedShapeSim =
    scaledShapeScore * SIMILARITY_CONFIG.finalWeights.shape;
  let similarity =
    weightedStrokeCountSim + weightedStrokeMatchSim + weightedShapeSim;

  // 패널티 적용
  let penaltyPoints = 0;

  const densityBias = scoreDensityBiasPenalty(
    normalizedPromptStrokes,
    normalizedPlayerStrokes,
  );
  penaltyPoints += densityBias.densityBiasScore;

  const inkLengthResult = scoreInkLengthPenalty(
    normalizedPromptStrokes,
    normalizedPlayerStrokes,
  );
  penaltyPoints += inkLengthResult.penaltyScore;

  if (strokeMatchSimilarity.getPenalty) {
    penaltyPoints += SIMILARITY_CONFIG.strokeMatchPenalty.maxPenalty;
  }

  similarity = Math.max(0, similarity - penaltyPoints);
  const roundedSimilarity = Math.round(similarity * 100) / 100;

  return {
    similarity: roundedSimilarity,
    strokeCountSimilarity: Math.round(weightedStrokeCountSim * 100) / 100,
    strokeMatchSimilarity: Math.round(weightedStrokeMatchSim * 100) / 100,
    shapeSimilarity: Math.round(weightedShapeSim * 100) / 100,
  };
};

// ----------helper-----------

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

const normalizeStrokes = (strokes: Stroke[]): Stroke[] => {
  if (strokes.length === 0) return [];

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

const applyNonLinearScale = (
  score: number,
  threshold = 70,
  steepness = 2,
): number => {
  // threshold 기준으로 낮은 점수는 더 낮게, 높은 점수는 더 높게
  if (score < threshold) {
    return Math.pow(score / 100, steepness) * 100;
  } else {
    return score;
  }
};

// 스트로크 개수 유사도 점수
const scoreStrokeCountSimilarity = (strokes1: Stroke[], strokes2: Stroke[]) => {
  const strokeCount1 = strokes1.length;
  const strokeCount2 = strokes2.length;
  if (strokeCount1 === 0 && strokeCount2 === 0) return 100;
  if (strokeCount1 === 0 || strokeCount2 === 0) return 0;

  const ratio =
    Math.min(strokeCount1, strokeCount2) / Math.max(strokeCount1, strokeCount2);
  return ratio * 100;
};
