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
}));
jest.mock("@mikro-orm/mysql", () => ({
  EntityRepository: class {},
}));

import { Drawing } from "src/modules/drawing/drawing.entity";
import { RankingSnapshotService } from "./ranking.snapshot.service";

describe("랭킹 스냅샷 갱신 서비스", () => {
  describe("refreshRankingSnapshot 메소드는", () => {
    describe("drawings 데이터가 있으면", () => {
      it("정렬된 top100 스냅샷을 재생성한다", async () => {
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
            totalSimilarity: 98.5,
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
            totalSimilarity: 87.2,
            createdAt: new Date("2026-04-18T00:01:00.000Z"),
            updatedAt: new Date("2026-04-18T00:01:00.000Z"),
            user: {
              id: 22n,
              name: "나",
            },
          },
        ] as Drawing[];
        const find = jest.fn().mockResolvedValue(drawings);
        const transactionalEm = {
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

        expect(find.mock.calls[0]).toEqual([
          Drawing,
          {},
          expect.objectContaining({
            populate: ["user"],
            limit: 100,
          }),
        ]);
        expect(nativeDelete.mock.calls[0]).toEqual([{}]);
        expect(insertMany).toHaveBeenCalledTimes(1);
        expect(insertedRankings).toHaveLength(2);
        expect(insertedRankings[0]).toEqual(
          expect.objectContaining({
            name: "가",
            strokes: "strokes-1",
            totalSimilarity: drawings[0].totalSimilarity,
            userId: 11n,
            drawingId: 1n,
          }),
        );
        expect(insertedRankings[1]).toEqual(
          expect.objectContaining({
            name: "나",
            strokes: "strokes-2",
            totalSimilarity: drawings[1].totalSimilarity,
            userId: 22n,
            drawingId: 2n,
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
