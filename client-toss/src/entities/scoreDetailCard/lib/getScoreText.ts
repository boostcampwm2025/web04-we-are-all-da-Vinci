export const getStrokeMatchText = (score: number): string[] => {
  if (score >= 80) return ["획의 길이·방향·위치까지 정확히 기억했어요"];
  if (score >= 50) return ["대부분 획을 비슷한 길이·방향으로 기억했어요"];
  return [
    "획의 길이·방향·위치 차이가 커요.",
    "각 선의 길이·방향을 눈에 담아 기억해보세요",
  ];
};

export const getShapeText = (score: number): string[] => {
  if (score >= 8) return ["전체 외곽 모양을 정확히 기억해 그렸어요"];
  if (score >= 5) return ["전체 외곽 모양을 잘 기억해 닮게 그렸어요"];
  return [
    "전체 외곽 모양에 차이가 있어요.",
    "큰 윤곽부터 눈에 담아 기억해보세요",
  ];
};

export const getPenaltyText = (penalty: number): string[] =>
  penalty === 0
    ? ["치우침·낙서 없이 기억한 대로 깔끔하게 그렸어요"]
    : ["치우치거나 불필요한 획이 많아요.", "위치·비율까지 떠올리며 그려보세요"];
