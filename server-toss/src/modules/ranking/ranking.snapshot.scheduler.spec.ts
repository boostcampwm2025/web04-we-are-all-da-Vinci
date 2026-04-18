import { describe, expect, it, jest } from "@jest/globals";
jest.mock("@nestjs/schedule", () => ({
  Cron: () => () => undefined,
  CronExpression: {
    EVERY_30_MINUTES: "*/30 * * * *",
  },
}));
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

import { RankingSnapshotScheduler } from "./ranking.snapshot.scheduler";

describe("랭킹 스냅샷 스케줄러", () => {
  describe("handleRankingSnapshotRefresh 메소드는", () => {
    describe("실행되면", () => {
      it("30분마다 갱신 서비스를 호출한다", async () => {
        const refreshRankingSnapshot = jest.fn().mockResolvedValue(undefined);
        const rankingSnapshotService = {
          refreshRankingSnapshot,
        };

        const scheduler = new RankingSnapshotScheduler(
          rankingSnapshotService as never,
        );
        await scheduler.handleRankingSnapshotRefresh();

        expect(refreshRankingSnapshot.mock.calls.length).toBe(1);
      });
    });
  });
});
