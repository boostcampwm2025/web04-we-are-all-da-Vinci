import { describe, expect, it } from "@jest/globals";
import { Ranking } from "../ranking.entity";
import {
  mapRankingToRankingListItem,
  mapRankingToPodiumItem,
} from "../ranking.mapper";

describe("랭킹 매퍼", () => {
  const ranking = {
    name: "홍길동",
    score: 91.25,
    userKey: 123,
    drawingId: 456,
  } as Ranking;

  describe("mapRankingToTop3Item은", () => {
    it("top3 응답 형식으로 변환한다", () => {
      expect(mapRankingToPodiumItem(ranking)).toEqual({
        name: "홍길동",
        score: 91.25,
      });
    });
  });

  describe("mapRankingToTop100Item은", () => {
    it("순위와 현재 사용자 여부를 포함한 top100 응답 형식으로 변환한다", () => {
      expect(mapRankingToRankingListItem(ranking, 2, 123)).toEqual({
        name: "홍길동",
        score: 91.25,
        userKey: 123,
        drawingId: "456",
        rank: 3,
        isMe: true,
      });
    });

    it("현재 사용자 정보가 없거나 다르면 isMe를 false로 변환한다", () => {
      expect(mapRankingToRankingListItem(ranking, 0)).toEqual({
        name: "홍길동",
        score: 91.25,
        userKey: 123,
        drawingId: "456",
        rank: 1,
        isMe: false,
      });
      expect(mapRankingToRankingListItem(ranking, 0, 999)).toEqual({
        name: "홍길동",
        score: 91.25,
        userKey: 123,
        drawingId: "456",
        rank: 1,
        isMe: false,
      });
    });
  });
});
