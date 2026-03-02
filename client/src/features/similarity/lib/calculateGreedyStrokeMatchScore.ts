import type { Stroke } from '@/entities/similarity';
import { comparePairwiseStrokeSimilarity } from './comparePairwiseStrokeSimilarity';
import { calculateColorSimilarity } from './calculateColorSimilarity';
import { SIMILARITY_CONFIG } from '../config/similarityConfig';

// 두 그림의 스트로크를 모두 일대일로 매칭하여 최종 스트로크 유사도 산출
export const calculateGreedyStrokeMatchScore = (
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
      similarityMatrix[i][j] = comparePairwiseStrokeSimilarity(
        strokes1[i],
        strokes2[j],
      );
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
      const strokeColorSim = calculateColorSimilarity(
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
