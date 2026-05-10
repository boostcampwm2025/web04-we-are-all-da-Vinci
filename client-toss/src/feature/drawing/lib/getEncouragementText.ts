import type { ScoreTrend } from "../config/scoring";

export const getEncouragementText = (
  score: number,
  trend: ScoreTrend,
  hasStrokes: boolean,
): string => {
  if (!hasStrokes) return "외운 그림을 떠올려봐요";

  if (trend === "up") return "점수가 올라가요";
  if (trend === "down") return "조금만 신중하게";

  if (score >= 80) return "거의 다 왔어요";
  if (score >= 60) return "잘하고 있어요";
  if (score >= 30) return "시작이 좋아요";
  return "차근차근 그려봐요";
};
