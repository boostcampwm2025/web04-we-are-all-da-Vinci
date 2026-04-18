import { describe, expect, it, jest } from "@jest/globals";
jest.mock("@mikro-orm/core", () => ({
  EntityRepositoryType: Symbol("EntityRepositoryType"),
}));
jest.mock("@mikro-orm/decorators/legacy", () => ({
  Entity: () => () => undefined,
  PrimaryKey: () => () => undefined,
  Property: () => () => undefined,
}));
jest.mock("@mikro-orm/nestjs", () => ({
  InjectRepository: () => () => undefined,
}));
jest.mock("@mikro-orm/mysql", () => ({
  EntityRepository: class {},
}));

import { Ranking } from "./ranking.entity";
import { RankingService } from "./ranking.service";
import { RankingRepository } from "./ranking.repository";

describe("랭킹 서비스", () => {
  const ranking = {
    name: "홍길동",
    totalSimilarity: 91.25,
    userId: 123n,
    drawingId: 456n,
  } as Ranking;

  describe("findTop3 메소드는", () => {
    it("top3 응답을 반환한다", async () => {
      const findTop = jest.fn().mockResolvedValue([ranking]);
      const rankingRepository = { findTop } as unknown as RankingRepository;

      const rankingService = new RankingService(rankingRepository);

      await expect(rankingService.findTop3()).resolves.toEqual([
        {
          name: "홍길동",
          similarity: 91.25,
        },
      ]);

      expect(findTop.mock.calls[0]).toEqual([3]);
    });
  });

  describe("findTop100 메소드는 ", () => {
    it("top100 응답을 반환한다", async () => {
      const findTop = jest.fn().mockResolvedValue([ranking]);
      const rankingRepository = { findTop } as unknown as RankingRepository;

      const rankingService = new RankingService(rankingRepository);

      await expect(rankingService.findTop100()).resolves.toEqual([
        {
          name: "홍길동",
          similarity: 91.25,
          userId: "123",
          drawingId: "456",
        },
      ]);

      expect(findTop.mock.calls[0]).toEqual([100]);
    });
  });
});
