import { describe, expect, it, jest } from "@jest/globals";
jest.mock("@mikro-orm/core", () => ({
  EntityRepositoryType: Symbol("EntityRepositoryType"),
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
  Index: () => () => undefined,
  CreateRequestContext: () => () => undefined,
}));
jest.mock("@mikro-orm/mysql", () => {
  const createSqlExpression = (expression: string) => ({
    as: (alias: string) => createSqlExpression(alias),
    toString: () => expression,
    valueOf: () => expression,
    [Symbol.toPrimitive]: () => expression,
  });

  return {
    EntityManager: class {},
    EntityRepository: class {},
    sql: (strings: TemplateStringsArray, ...values: unknown[]) => {
      const expression = strings.reduce((acc, string, index) => {
        const value = index < values.length ? String(values[index]) : "";
        return `${acc}${string}${value}`;
      }, "");

      return createSqlExpression(expression);
    },
  };
});

import { Drawing } from "src/modules/drawing/drawing.entity";
import { RankingSnapshotService } from "./ranking.snapshot.service";

function createQueryBuilderMock(rows: Array<{ id: bigint }> = []) {
  return {
    select: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    with: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue(rows),
  };
}

describe("랭킹 스냅샷 갱신 서비스", () => {
  describe("refreshRankingSnapshot 메소드는", () => {
    describe("drawings 데이터가 있으면", () => {
      beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date("2026-04-18T06:00:00.000Z"));
      });

      afterEach(() => {
        jest.useRealTimers();
      });
      it("정렬된 랭킹 스냅샷을 재생성한다", async () => {
        const insertedRankings: unknown[] = [];
        const nativeDelete = jest.fn().mockResolvedValue(0);
        const insertMany = jest.fn().mockImplementation((rankings) => {
          insertedRankings.push(...rankings);
          return rankings;
        });
        const rankingRepository = {
          nativeDelete,
          insertMany,
        };
        const drawings = [
          {
            id: 1n,
            strokes: "strokes-1",
            similarity: "unused-1",
            score: 98.5,
            createdAt: new Date("2026-04-18T00:00:00.000Z"),
            updatedAt: new Date("2026-04-18T00:00:00.000Z"),
            user: {
              id: 11n,
              name: "가",
            },
          },
          {
            id: 2n,
            strokes: "strokes-2",
            similarity: "unused-2",
            score: 87.2,
            createdAt: new Date("2026-04-18T00:01:00.000Z"),
            updatedAt: new Date("2026-04-18T00:01:00.000Z"),
            user: {
              id: 22n,
              name: "나",
            },
          },
        ] as Drawing[];
        const find = jest.fn().mockResolvedValue(drawings);
        const rankedDrawingsQb = createQueryBuilderMock();
        const rowsQb = createQueryBuilderMock([{ id: 1n }, { id: 2n }]);
        const createQueryBuilder = jest
          .fn()
          .mockReturnValueOnce(rankedDrawingsQb)
          .mockReturnValueOnce(rowsQb);
        const transactionalEm = {
          createQueryBuilder,
          find,
          getRepository: jest.fn().mockReturnValue(rankingRepository),
        };
        const em = {
          transactional: jest.fn().mockImplementation(async (callback) => {
            return await callback(transactionalEm);
          }),
        };

        const service = new RankingSnapshotService(em as never);
        await service.refreshRankingSnapshot();

        expect(createQueryBuilder.mock.calls).toEqual([
          [Drawing, "d"],
          [Drawing],
        ]);
        expect(rankedDrawingsQb.select).toHaveBeenCalledTimes(1);
        expect(rankedDrawingsQb.leftJoin).toHaveBeenCalledTimes(1);
        expect(rankedDrawingsQb.where).toHaveBeenCalledTimes(1);
        expect(rowsQb.with).toHaveBeenCalledWith(
          "ranked_drawings",
          rankedDrawingsQb,
        );
        expect(rowsQb.select).toHaveBeenCalledTimes(1);
        expect(rowsQb.from).toHaveBeenCalledTimes(1);
        expect(rowsQb.where).toHaveBeenCalledTimes(1);
        expect(rowsQb.orderBy).toHaveBeenCalledTimes(1);
        expect(rowsQb.execute).toHaveBeenCalledTimes(1);
        expect(find.mock.calls[0]).toEqual([
          Drawing,
          {
            id: {
              $in: [1n, 2n],
            },
          },
          expect.objectContaining({
            populate: ["user"],
          }),
        ]);
        expect(nativeDelete.mock.calls[0]).toEqual([{}]);
        expect(insertMany).toHaveBeenCalledTimes(1);
        expect(insertedRankings).toHaveLength(2);
        expect(insertedRankings[0]).toEqual(
          expect.objectContaining({
            name: "가",
            strokes: "strokes-1",
            score: drawings[0].score,
            userId: 11n,
            drawingId: 1n,
            submittedAt: new Date("2026-04-18T00:00:00.000Z"),
          }),
        );
        expect(insertedRankings[1]).toEqual(
          expect.objectContaining({
            name: "나",
            strokes: "strokes-2",
            score: drawings[1].score,
            userId: 22n,
            drawingId: 2n,
            submittedAt: new Date("2026-04-18T00:01:00.000Z"),
          }),
        );
      });
    });

    describe("이미 갱신 중이면", () => {
      it("중복 갱신을 건너뛴다", async () => {
        const em = {
          transactional: jest.fn(),
        };
        const service = new RankingSnapshotService(em as never);

        (service as unknown as { isRefreshing: boolean }).isRefreshing = true;

        await service.refreshRankingSnapshot();

        expect(em.transactional).not.toHaveBeenCalled();
      });
    });
  });
});
