import type { Stroke } from '@shared/types';
import { SIMILARITY_CONFIG } from '../config/similarityConfig';
import { clamp } from './math';
import { getTotalLength } from './geometry';

type InkStats = {
  maxRatio: number; // 0~1 (1에 가까울수록 한 셀에 몰림)
  usedRatio: number; // 0~1 (사용한 셀 비율)
  totalLen: number; // 총 스트로크 길이
};

const calcInkStats = (strokes: Stroke[], grid = 8): InkStats => {
  const bins = new Array(grid * grid).fill(0);
  let total = 0;

  for (const s of strokes) {
    const [xs, ys] = s.points;
    for (let i = 1; i < xs.length; i++) {
      const x0 = xs[i - 1],
        y0 = ys[i - 1];
      const x1 = xs[i],
        y1 = ys[i];
      const dx = x1 - x0,
        dy = y1 - y0;
      const len = Math.hypot(dx, dy);
      if (len <= 0) continue;

      // 선분 중점이 속한 셀에 길이를 누적
      const mx = (x0 + x1) / 2;
      const my = (y0 + y1) / 2;

      const ix = Math.max(0, Math.min(grid - 1, Math.floor(mx * grid)));
      const iy = Math.max(0, Math.min(grid - 1, Math.floor(my * grid)));
      bins[iy * grid + ix] += len;

      total += len;
    }
  }

  if (total <= 0) return { maxRatio: 0, usedRatio: 0, totalLen: 0 };

  let used = 0;
  let maxBin = 0;

  for (const b of bins) {
    if (b > 0) used++;
    if (b > maxBin) maxBin = b;
  }

  const maxRatio = maxBin / total;

  return {
    maxRatio: clamp(maxRatio, 0, 1),
    usedRatio: clamp(used / (grid * grid), 0, 1),
    totalLen: total,
  };
};

// 밀도 편향 패널티: 플레이어가 프롬프트 대비 너무 한쪽에 몰려 그리면 감점
export const scoreDensityBiasPenalty = (
  promptStrokes: Stroke[],
  playerStrokes: Stroke[],
) => {
  const grid = SIMILARITY_CONFIG.densityBias.gridSize;
  const p = calcInkStats(promptStrokes, grid);
  const u = calcInkStats(playerStrokes, grid);

  const maxRatioGap = u.maxRatio - p.maxRatio; // +면 플레이어가 더 몰림
  const usedGap = p.usedRatio - u.usedRatio; // +면 플레이어가 더 적은 셀 사용

  const maxRatioPenalty = clamp(
    (maxRatioGap - SIMILARITY_CONFIG.densityBias.maxRatioFreezone) /
      SIMILARITY_CONFIG.densityBias.scaleSlope,
    0,
    1,
  );
  const usedPenalty = clamp(
    (usedGap - SIMILARITY_CONFIG.densityBias.usedRatioFreezone) /
      SIMILARITY_CONFIG.densityBias.scaleSlope,
    0,
    1,
  );

  const penalty =
    SIMILARITY_CONFIG.densityBias.maxRatioPenaltyWeight * maxRatioPenalty +
    SIMILARITY_CONFIG.densityBias.usedRatioPenaltyWeight * usedPenalty;

  // 가중치 적용
  const weight = SIMILARITY_CONFIG.densityBias.weight;
  const weightedPenalty = penalty * weight;

  const densityBiasScore =
    clamp(weightedPenalty, 0, 1) * SIMILARITY_CONFIG.densityBias.maxPenalty;

  return {
    densityBiasScore,
  };
};

// 잉크 길이 비율 패널티: 제시 그림보다 비정상적으로 길면(낙서) 감점
export const scoreInkLengthPenalty = (
  promptStrokes: Stroke[],
  playerStrokes: Stroke[],
) => {
  const promptLen = getTotalLength(promptStrokes);
  const playerLen = getTotalLength(playerStrokes);

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
  };
};
