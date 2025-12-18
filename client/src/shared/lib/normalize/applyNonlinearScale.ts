/**
 * 점수를 비선형으로 변환 (차이를 극대화)
 */
export const applyNonLinearScale = (
  score: number,
  threshold = 70,
  steepness = 2,
): number => {
  // threshold 기준으로 낮은 점수는 더 낮게, 높은 점수는 더 높게
  if (score < threshold) {
    // 낮은 점수는 제곱으로 더 낮춤
    return Math.pow(score / 100, steepness) * 100;
  } else {
    // 높은 점수는 유지하되 약간만 강조
    const normalized = (score - threshold) / (100 - threshold);
    return threshold + normalized * (100 - threshold);
  }
};
