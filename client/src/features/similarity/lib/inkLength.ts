import type { Stroke } from '@shared/types';
import { calculateTotalLength } from './strokeGeometry';
import { SIMILARITY_CONFIG } from '../config/similarityConfig';
import { clamp } from './math';

/**
 * 잉크 길이 비율 패널티
 * - 내 그림이 제시 그림보다 비정상적으로 길면(낙서) 패널티 부여
 */
export const calculateInkLengthPenalty = (
  promptStrokes: Stroke[],
  playerStrokes: Stroke[],
) => {
  const promptLen = calculateTotalLength(promptStrokes);
  const playerLen = calculateTotalLength(playerStrokes);

  // 0으로 나눔 방지
  if (promptLen === 0) {
    return { penaltyScore: 0, ratio: 0, rawPenalty: 0 };
  }

  const ratio = playerLen / promptLen;
  const threshold = SIMILARITY_CONFIG.inkLength.threshold;
  const maxRatio = SIMILARITY_CONFIG.inkLength.maxRatio;
  const maxPenaltyScore = SIMILARITY_CONFIG.inkLength.maxPenalty;

  // 임계값 이하면 패널티 없음
  if (ratio <= threshold) {
    return { penaltyScore: 0, ratio, rawPenalty: 0 };
  }

  // threshold ~ maxRatio 구간에서 0 ~ 1로 선형 증가
  // (ratio - threshold) / (maxRatio - threshold)
  let t = (ratio - threshold) / (maxRatio - threshold);
  t = clamp(t, 0, 1);

  const penaltyFactor = t;

  const penaltyScore = penaltyFactor * maxPenaltyScore;

  return {
    penaltyScore,
    ratio,
    rawPenalty: penaltyFactor, // 0~1
  };
};
