import {
  describe,
  expect,
  it,
  jest,
  beforeEach,
  afterEach,
} from "@jest/globals";

jest.mock("@mikro-orm/core", () => ({
  EntityRepositoryType: Symbol("EntityRepositoryType"),
  EntityManager: class {},
  QueryOrder: {
    ASC: "asc",
    DESC: "desc",
  },
}));
jest.mock("@mikro-orm/decorators/legacy", () => ({
  Entity: () => () => undefined,
  ManyToOne: () => () => undefined,
  PrimaryKey: () => () => undefined,
  Property: () => () => undefined,
}));
jest.mock("@mikro-orm/nestjs", () => ({
  InjectRepository: () => () => undefined,
}));
jest.mock("@mikro-orm/mysql", () => ({
  EntityRepository: class {},
}));

import { EntityManager, QueryOrder } from "@mikro-orm/core";
import { Drawing } from "src/modules/drawing/drawing.entity";
import { Ranking } from "./ranking.entity";
import { RankingRepository } from "./ranking.repository";
import { RankingService } from "./ranking.service";

describe("랭킹 서비스", () => {
  const ranking = {
    name: "홍길동",
    score: 91.25,
    userId: 123n,
    drawingId: 456n,
  } as Ranking;
  const rankingRepository = {} as unknown as RankingRepository;
  const em = {} as unknown as EntityManager;

  describe("findTop3 메소드는", () => {
    it("top3 응답을 반환한다", async () => {
      const findTop = jest.fn().mockResolvedValue([ranking]);
      const repository = { findTop } as unknown as RankingRepository;

      const rankingService = new RankingService(repository, em);

      await expect(rankingService.findTop3()).resolves.toEqual([
        {
          name: "홍길동",
          score: 91.25,
        },
      ]);

      expect(findTop.mock.calls[0]).toEqual([3]);
    });
  });

  describe("findTop100 메소드는 ", () => {
    it("top100 응답을 반환한다", async () => {
      const findTop = jest.fn().mockResolvedValue([ranking]);
      const repository = { findTop } as unknown as RankingRepository;

      const rankingService = new RankingService(repository, em);

      await expect(rankingService.findTop100()).resolves.toEqual([
        {
          name: "홍길동",
          score: 91.25,
          userId: "123",
          drawingId: "456",
        },
      ]);

      expect(findTop.mock.calls[0]).toEqual([100]);
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
        const drawings = [
          {
            id: 1n,
            score: 99.8,
            createdAt: new Date("2026-04-18T15:10:00.000Z"),
            user: {
              id: 11n,
              name: "첫번째",
            },
          },
          {
            id: 2n,
            score: 98.2,
            createdAt: new Date("2026-04-18T15:20:00.000Z"),
            user: {
              id: 22n,
              name: "두번째",
            },
          },
          {
            id: 3n,
            score: 97.7,
            createdAt: new Date("2026-04-18T15:30:00.000Z"),
            user: {
              id: 11n,
              name: "첫번째",
            },
          },
        ] as never[];
        const find = jest.fn().mockResolvedValue(drawings);
        const entityManager = {
          find,
        } as unknown as EntityManager;
        const service = new RankingService(rankingRepository, entityManager);

        await expect(service.findMyRanking(11n)).resolves.toEqual({
          state: "FOUND",
          ranking: {
            rank: 1,
            score: 99.8,
          },
        });

        expect(find.mock.calls[0]).toEqual([
          Drawing,
          {
            createdAt: {
              $gte: new Date("2026-04-18T15:00:00.000Z"),
              $lt: new Date("2026-04-19T15:00:00.000Z"),
            },
          },
          expect.objectContaining({
            populate: ["user"],
            orderBy: [
              {
                score: QueryOrder.DESC,
                createdAt: QueryOrder.ASC,
                user: { name: QueryOrder.ASC },
              },
            ],
          }),
        ]);
      });
    });

    describe("오늘 제출한 drawing이 없으면", () => {
      it("미제출 내부 키를 반환한다", async () => {
        const drawings = [
          {
            id: 1n,
            score: 99.8,
            createdAt: new Date("2026-04-18T15:10:00.000Z"),
            user: {
              id: 22n,
              name: "다른사람",
            },
          },
        ] as never[];
        const find = jest.fn().mockResolvedValue(drawings);
        const entityManager = {
          find,
        } as unknown as EntityManager;
        const service = new RankingService(rankingRepository, entityManager);

        await expect(service.findMyRanking(11n)).resolves.toEqual({
          state: "NOT_SUBMITTED",
          message: "NOT_SUBMITTED",
        });
      });
    });
  });
});
