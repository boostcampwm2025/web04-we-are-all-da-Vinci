export const getStrokeMatchText = (score: number): string[] => {
  if (score >= 80)
    return ["획 하나하나의 길이·방향·위치가 제시 그림과 거의 같아요"];
  if (score >= 50)
    return ["대부분의 획이 제시 그림과 비슷한 길이와 방향으로 그어졌어요"];
  return [
    "획의 길이·방향·위치가 제시 그림과 많이 달라요.",
    "시작점부터 천천히 따라 그려보세요",
  ];
};

export const getShapeText = (score: number): string[] => {
  if (score >= 8) return ["그림 전체의 외곽 모양이 제시 그림과 거의 일치해요"];
  if (score >= 5) return ["그림 전체의 외곽 모양이 제시 그림과 닮았어요"];
  return [
    "그림 전체의 외곽 모양에 차이가 있어요.",
    "큰 윤곽부터 잡아보면 좋아요",
  ];
};

export const getPenaltyText = (penalty: number): string[] =>
  penalty === 0
    ? ["한쪽 치우침이나 낙서 없이 깔끔하게 그렸어요"]
    : [
        "한쪽으로 치우치거나 불필요한 획이 많아요.",
        "다음엔 좀 더 깔끔하게 따라 그려보세요",
      ];
