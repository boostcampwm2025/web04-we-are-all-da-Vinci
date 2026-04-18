import { describe, expect, it } from "@jest/globals";
import { Ranking } from "./ranking.entity";
import { mapRankingToTop100Item, mapRankingToTop3Item } from "./ranking.mapper";

describe("랭킹 매퍼", () => {
  const ranking = {
    name: "홍길동",
    similarity: JSON.stringify({
      similarity: 91.25,
      strokeCountSimilarity: 90,
      strokeMatchSimilarity: 92,
      shapeSimilarity: 91,
    }),
    userId: 123n,
    drawingId: 456n,
  } as Ranking;

  describe("mapRankingToTop3Item은", () => {
    it("top3 응답 형식으로 변환한다", () => {
      expect(mapRankingToTop3Item(ranking)).toEqual({
        name: "홍길동",
        similarity: 91.25,
      });
    });
  });

  describe("mapRankingToTop100Item은", () => {
    it("top100 응답 형식으로 변환한다", () => {
      expect(mapRankingToTop100Item(ranking)).toEqual({
        name: "홍길동",
        similarity: 91.25,
        userId: "123",
        drawingId: "456",
      });
    });
  });
});
