import type { Stroke } from '@/entities/drawing/model/types';
import { compareStrokes } from './compareStrokes';

/**
 * 두 stroke 집합 간의 최적 매칭 찾기 (Hungarian Algorithm 간소화)
 * @param {Array} strokes1 - 원본 strokes
 * @param {Array} strokes2 - 사용자 strokes
 * @returns {number} - 평균 유사도 (0~100)
 */
export const matchStrokes = (strokes1: Stroke[], strokes2: Stroke[]) => {
  if (strokes1.length === 0 && strokes2.length === 0) return 100;
  if (strokes1.length === 0 || strokes2.length === 0) return 0;

  const n1 = strokes1.length;
  const n2 = strokes2.length;

  // 유사도 행렬 계산
  const similarityMatrix = [];
  for (let i = 0; i < n1; i++) {
    similarityMatrix[i] = [];
    for (let j = 0; j < n2; j++) {
      similarityMatrix[i][j] = compareStrokes(strokes1[i], strokes2[j]);
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

  for (const pair of pairs) {
    if (!used1.has(pair.i) && !used2.has(pair.j)) {
      used1.add(pair.i);
      used2.add(pair.j);
      matches.push(pair.similarity);
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
  return avgSimilarity;
};
