import type { RankingListItem } from "../model/types";
import type { Stroke } from "@toss/shared";

const makeStroke = (
  xPoints: number[],
  yPoints: number[],
  color: [number, number, number] = [0, 0, 0],
): Stroke => ({
  points: [xPoints, yPoints],
  color,
});

const DRAWING_TEMPLATES: Stroke[][] = [
  [
    makeStroke(
      [175, 245, 320, 335, 255, 170, 175],
      [145, 90, 145, 320, 395, 310, 145],
    ),
    makeStroke([220, 220], [205, 232]),
    makeStroke([285, 285], [205, 232]),
    makeStroke([225, 250, 285], [285, 312, 285]),
    makeStroke([212, 240, 262, 290], [118, 70, 120, 76]),
  ],
  [
    makeStroke(
      [150, 175, 240, 322, 352, 310, 210, 150],
      [250, 160, 120, 150, 250, 335, 360, 250],
    ),
    makeStroke([215, 215], [215, 240]),
    makeStroke([285, 285], [215, 240]),
    makeStroke([220, 250, 285], [285, 305, 285]),
  ],
  [
    makeStroke([250, 160, 200, 300, 340, 250], [110, 220, 360, 360, 220, 110]),
    makeStroke([215, 215], [230, 255]),
    makeStroke([285, 285], [230, 255]),
    makeStroke([220, 250, 285], [300, 320, 300]),
  ],
  [
    makeStroke(
      [170, 230, 310, 350, 310, 230, 170],
      [190, 120, 150, 240, 340, 360, 190],
    ),
    makeStroke([225, 225], [225, 250]),
    makeStroke([300, 300], [225, 250]),
    makeStroke([235, 270, 305], [300, 325, 300]),
  ],
  [
    makeStroke([170, 210, 250, 290, 330], [260, 180, 120, 180, 260]),
    makeStroke([170, 205, 250, 295, 330], [260, 360, 390, 360, 260]),
    makeStroke([220, 220], [245, 268]),
    makeStroke([280, 280], [245, 268]),
    makeStroke([225, 250, 278], [310, 330, 310]),
  ],
  [
    makeStroke(
      [165, 215, 285, 335, 315, 185, 165],
      [210, 130, 130, 210, 350, 350, 210],
    ),
    makeStroke([205, 205], [220, 245]),
    makeStroke([295, 295], [220, 245]),
    makeStroke([220, 250, 290], [295, 318, 295]),
    makeStroke([250, 250], [130, 90]),
  ],
];

const NICKNAMES = [
  "나테스트",
  "연필마스터",
  "기억화가",
  "다빈치꿈나무",
  "스케치왕",
  "눈감고슥슥",
  "선긋는사람",
  "오늘의화백",
  "낙서천재",
  "감각적인손",
];

export const mockRankingList: RankingListItem[] = Array.from(
  { length: 100 },
  (_, index) => {
    const rank = index + 1;
    const score = Number(Math.max(1, 99.8 - index * 0.83).toFixed(2));
    const strokeMatchSimilarity = Number(
      Math.max(8, score * 0.44 - (index % 5)).toFixed(2),
    );
    const shapeSimilarity = Number(
      Math.max(8, score * 0.52 - (index % 7)).toFixed(2),
    );
    const penalty = Number(
      Math.max(0, strokeMatchSimilarity + shapeSimilarity - score).toFixed(2),
    );

    return {
      userKey: 100000 + rank,
      nickname:
        rank === 1
          ? NICKNAMES[0]
          : `${NICKNAMES[index % NICKNAMES.length]}${rank}`,
      drawingId: `mock-ranking-${rank}`,
      rank,
      score,
      isMe: rank === 1,
      strokes: DRAWING_TEMPLATES[index % DRAWING_TEMPLATES.length],
      similarity: {
        score,
        strokeMatchSimilarity,
        shapeSimilarity,
        penalty,
      },
    };
  },
);
