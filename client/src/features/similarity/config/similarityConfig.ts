export const SIMILARITY_CONFIG = {
  finalWeights: {
    strokeCount: 0,
    strokeMatch: 0.9,
    shape: 0.1,
  },
  strokeMatchPenalty: {
    enabled: true,
    threshold: 60,
    maxPenalty: 10,
  },
  densityBias: {
    enabled: true,
    gridSize: 8,
    weight: 1.0,
    maxPenalty: 25,
    maxRatioFreezone: 0.08,
    usedRatioFreezone: 0.05,
    scaleSlope: 0.25,
    maxRatioPenaltyWeight: 0.7,
    usedRatioPenaltyWeight: 0.3,
  },
  inkLength: {
    enabled: true,
    threshold: 1.5,
    maxRatio: 4.0,
    maxPenalty: 40,
  },
};
