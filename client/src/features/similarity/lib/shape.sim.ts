import type { PreprocessedStrokeData } from '../model/preprocessedStrokeData';
import { cosineSimilarity, relativeSimilarity } from './math';

// 전처리된 데이터로 형태 유사도 계산
export const scoreShapeSimilarity = (
  preprocessedPrompt: PreprocessedStrokeData,
  preprocessedPlayer: PreprocessedStrokeData,
): number => {
  // hull 기반 형태 유사도
  const areaSim = scoreAreaSimilarity(
    preprocessedPrompt.hullArea,
    preprocessedPlayer.hullArea,
  );
  const perimeterSim = scorePerimeterSimilarity(
    preprocessedPrompt.hullPerimeter,
    preprocessedPlayer.hullPerimeter,
  );
  const hullSim = areaSim * 0.5 + perimeterSim * 0.5;

  // 각도 기반 형태 유사도
  const cosSim = cosineSimilarity(
    preprocessedPrompt.radialSignature,
    preprocessedPlayer.radialSignature,
  );
  const radialSim = Math.max(0, Math.min(1, cosSim));

  const shapeSim = (hullSim * 0.6 + radialSim * 0.4) * 100;

  return shapeSim;
};

// ---------Helper----------

const scoreAreaSimilarity = (area1: number, area2: number): number => {
  if (area1 === 0 && area2 === 0) return 1;
  if (area1 === 0 || area2 === 0) return 0;

  return relativeSimilarity(area1, area2);
};

const scorePerimeterSimilarity = (p1: number, p2: number): number => {
  if (p1 === 0 && p2 === 0) return 1;
  if (p1 === 0 || p2 === 0) return 0;

  return relativeSimilarity(p1, p2);
};
