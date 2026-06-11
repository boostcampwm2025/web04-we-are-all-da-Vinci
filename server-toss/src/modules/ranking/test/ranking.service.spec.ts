import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";

import { Ranking } from "../ranking.entity";
import { RankingRepository } from "../ranking.repository";
import { RankingService } from "../ranking.service";

describe("랭킹 서비스", () => {
  const ranking = {
    nickname: "홍길동닉",
    score: 91.25,
    userKey: 123,
    drawingId: 456,
  } as Ranking;

  describe("findTop3 메소드는", () => {
    it("top3 목록과 오늘 참가자 수를 함께 반환한다", async () => {
      const findTop = jest.fn().mockResolvedValue([ranking]);
      const countTodayParticipants = jest.fn().mockResolvedValue(7);
      const repository = {
        findTop,
        countTodayParticipants,
      } as unknown as RankingRepository;

      const rankingService = new RankingService(repository);

      await expect(rankingService.findPodium()).resolves.toEqual({
        podium: [
          {
            nickname: "홍길동닉",
            score: 91.25,
          },
        ],
        participantCount: 7,
      });

      expect(findTop.mock.calls[0]).toEqual([3]);
    });
  });

  describe("findTop100 메소드는 ", () => {
    it("userKey 없이 top100 응답을 반환하면 isMe를 false로 채운다", async () => {
      const findTop = jest.fn().mockResolvedValue([ranking]);
      const findLatestUpdatedAt = jest
        .fn()
        .mockResolvedValue(new Date("2026-04-18T00:00:00.000Z"));
      const repository = {
        findTop,
        findLatestUpdatedAt,
      } as unknown as RankingRepository;

      const rankingService = new RankingService(repository);

      await expect(rankingService.findRankingList()).resolves.toEqual({
        updatedAt: "2026-04-18T00:00:00.000Z",
        rankings: [
          {
            nickname: "홍길동닉",
            score: 91.25,
            userKey: 123,
            drawingId: "456",
            rank: 1,
            isMe: false,
          },
        ],
      });

      expect(findTop.mock.calls[0]).toEqual([100]);
      expect(findLatestUpdatedAt.mock.calls.length).toBe(1);
    });

    it("userKey가 주어지면 일치하는 항목만 isMe를 true로 반환한다", async () => {
      const findTop = jest.fn().mockResolvedValue([
        ranking,
        {
          nickname: "임꺽정닉",
          score: 88.5,
          userKey: 999,
          drawingId: 777,
        } as Ranking,
      ]);
      const findLatestUpdatedAt = jest
        .fn()
        .mockResolvedValue(new Date("2026-04-18T00:00:00.000Z"));
      const repository = {
        findTop,
        findLatestUpdatedAt,
      } as unknown as RankingRepository;

      const rankingService = new RankingService(repository);

      await expect(rankingService.findRankingList(123)).resolves.toEqual({
        updatedAt: "2026-04-18T00:00:00.000Z",
        rankings: [
          {
            nickname: "홍길동닉",
            score: 91.25,
            userKey: 123,
            drawingId: "456",
            rank: 1,
            isMe: true,
          },
          {
            nickname: "임꺽정닉",
            score: 88.5,
            userKey: 999,
            drawingId: "777",
            rank: 2,
            isMe: false,
          },
        ],
      });
    });
  });

  describe("findMyRanking 메소드는", () => {
    describe("오늘 제출한 drawing이 있으면", () => {
      beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date("2026-04-19T06:00:00.000Z"));
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      it("가장 높은 순위의 drawing을 반환한다", async () => {
        const ranking = { score: 87.54, rank: 45 } as never;
        const findMyRanking = jest.fn().mockResolvedValue(ranking);
        const repository = {
          findMyRanking,
        } as unknown as RankingRepository;
        const service = new RankingService(repository);

        await expect(service.findMyRanking(11)).resolves.toEqual({
          state: "FOUND",
          ranking: {
            score: 87.54,
            rank: 45,
          },
        });

        expect(findMyRanking.mock.calls[0][0]).toEqual(11);
      });
    });

    describe("오늘 제출한 drawing이 없으면", () => {
      it("미제출 내부 키를 반환한다", async () => {
        const findMyRanking = jest.fn().mockResolvedValue(null as never);
        const repository = { findMyRanking } as unknown as RankingRepository;

        const service = new RankingService(repository);

        await expect(service.findMyRanking(11)).resolves.toEqual({
          state: "NOT_SUBMITTED",
          message: "NOT_SUBMITTED",
        });
      });
    });
  });
});
