import type { Color, Stroke } from '@shared/types';
import { SIMILARITY_CONFIG } from '../config/similarityConfig';
import {
  getStrokeBoundingBox,
  getStrokeDirection,
  getStrokeLength,
} from './geometry';
import { euclideanDistance, relativeSimilarity } from './math';

// 두 스트로크를 일대일로 비교
export const scoreStrokeSimilarity = (
  stroke1: Stroke,
  stroke2: Stroke,
): number => {
  const lengthSimilarity = scoreLengthSimilarity(stroke1, stroke2);
  const directionSimilarity = scoreDirectionSimilarity(stroke1, stroke2);
  const positionSimilarity = scorePositionSimilarity(stroke1, stroke2);

  const similarity =
    lengthSimilarity * SIMILARITY_CONFIG.strokeWeights.length +
    directionSimilarity * SIMILARITY_CONFIG.strokeWeights.direction +
    positionSimilarity * SIMILARITY_CONFIG.strokeWeights.position;

  return similarity * 100;
};

// 두 그림의 스트로크를 모두 일대일로 매칭하여 최종 스트로크 유사도 산출
export const scoreGreedyStrokeMatch = (
  strokes1: Stroke[],
  strokes2: Stroke[],
): {
  score: number;
  getPenalty: boolean;
  outlierRatio: number;
} => {
  if (strokes1.length === 0 && strokes2.length === 0)
    return { score: 100, getPenalty: false, outlierRatio: 0 };
  if (strokes1.length === 0 || strokes2.length === 0)
    return { score: 0, getPenalty: false, outlierRatio: 0 };

  const n1 = strokes1.length;
  const n2 = strokes2.length;

  // 유사도 행렬 계산
  const similarityMatrix: number[][] = [];
  for (let i = 0; i < n1; i++) {
    similarityMatrix[i] = [];
    for (let j = 0; j < n2; j++) {
      similarityMatrix[i][j] = scoreStrokeSimilarity(strokes1[i], strokes2[j]);
    }
  }

  // Greedy 매칭
  const used1 = new Set();
  const used2 = new Set();
  const matches = [];

  // 높은 유사도부터 매칭
  const pairs = [];
  for (let i = 0; i < n1; i++) {
    for (let j = 0; j < n2; j++) {
      pairs.push({ i, j, similarity: similarityMatrix[i][j] });
    }
  }
  pairs.sort((a, b) => b.similarity - a.similarity);

  let outlierScoreCount = 0;
  for (const pair of pairs) {
    if (!used1.has(pair.i) && !used2.has(pair.j)) {
      used1.add(pair.i);
      used2.add(pair.j);

      const strokeShapeSim = pair.similarity;
      const strokeColorSim = scoreColorSimilarity(
        strokes1[pair.i].color,
        strokes2[pair.j].color,
      );

      const finalPairSim = strokeShapeSim * (0.7 + 0.3 * strokeColorSim);
      matches.push(finalPairSim);

      const threshold = SIMILARITY_CONFIG.strokeMatchPenalty.threshold;
      if (finalPairSim <= threshold) {
        outlierScoreCount += 1;
      }
    }
  }

  // 매칭 안 된 stroke는 0점 처리
  const unmatchedCount = Math.max(n1, n2) - matches.length;
  for (let i = 0; i < unmatchedCount; i++) {
    matches.push(0);
  }

  // 평균 계산
  const avgSimilarity =
    matches.reduce((sum, s) => sum + s, 0) / Math.max(n1, n2);
  return {
    score: avgSimilarity,
    getPenalty: outlierScoreCount >= Math.ceil(matches.length / 2),
    outlierRatio: matches.length > 0 ? outlierScoreCount / matches.length : 0,
  };
};

// ---------Helper----------

// 길이 유사도: 두 스트로크의 길이가 얼마나 비슷한가
const scoreLengthSimilarity = (stroke1: Stroke, stroke2: Stroke): number => {
  const len1 = getStrokeLength(stroke1);
  const len2 = getStrokeLength(stroke2);
  return relativeSimilarity(len1, len2);
};

// 방향 유사도: 두 스트로크의 가중평균방향이 얼마나 비슷한가
const scoreDirectionSimilarity = (stroke1: Stroke, stroke2: Stroke): number => {
  const dir1 = getStrokeDirection(stroke1);
  const dir2 = getStrokeDirection(stroke2);
  let dirDiff = Math.abs(dir1 - dir2);
  if (dirDiff > Math.PI) dirDiff = 2 * Math.PI - dirDiff; // 각도 정규화
  return 1 - dirDiff / Math.PI;
};

// 위치 유사도: 두 스트로크의 상대위치가 얼마나 비슷한가
const scorePositionSimilarity = (stroke1: Stroke, stroke2: Stroke): number => {
  // 각 스트로크의 바운딩 박스
  const bbox1 = getStrokeBoundingBox(stroke1);
  const bbox2 = getStrokeBoundingBox(stroke2);

  // 1. 중심점 거리
  const centerDist = euclideanDistance(
    bbox2.centerX,
    bbox2.centerY,
    bbox1.centerX,
    bbox1.centerY,
  );
  const centerSim = Math.max(0, 1 - centerDist / 1.0);

  // 2. 크기 유사도 (너비와 높이)
  const widthSim = relativeSimilarity(bbox1.width, bbox2.width);
  const heightSim = relativeSimilarity(bbox1.height, bbox2.height);
  const sizeSim = (widthSim + heightSim) / 2;

  // 중심 위치(60%) + 크기(40%)
  return centerSim * 0.6 + sizeSim * 0.4;
};

// RGB 벡터 유클리드 거리 사용해 유사도 계산
const scoreColorSimilarity = (c1: Color, c2: Color, gamma = 2.5): number => {
  const dr = c1[0] - c2[0];
  const dg = c1[1] - c2[1];
  const db = c1[2] - c2[2];
  const d = Math.hypot(dr, dg, db);
  const dMax = Math.sqrt(3 * 255 * 255);
  const x = d / dMax;

  const sim = Math.pow(1 - x, gamma);
  return Math.max(0, Math.min(1, sim));
};
