import { Logger } from "@nestjs/common";
import { describe, expect, it, jest } from "@jest/globals";
jest.mock("@nestjs/schedule", () => ({
  Cron: () => () => undefined,
  CronExpression: {
    EVERY_DAY_AT_MIDNIGHT: "0 0 * * *",
  },
}));

import { RankingCleanupScheduler } from "../ranking.cleanup.scheduler";
describe("랭킹 클린업 스케줄러", () => {
  describe("handleRankingSnapshotCleanup 메소드는", () => {
    describe("실행되면", () => {
      it("매일 새벽마다 갱신 서비스를 호출한다", async () => {
        const cleanupRanking = jest.fn().mockResolvedValue(undefined);
        const rankingRepository = {
          cleanupRanking,
        };

        const scheduler = new RankingCleanupScheduler(
          rankingRepository as never,
        );
        await scheduler.handleRankingSnapshotCleanup();

        expect(cleanupRanking.mock.calls.length).toBe(1);
      });
    });

    describe("실행에 실패하면", () => {
      it("에러 로그를 기록한다.", async () => {
        const rankingRepository = {
          cleanupRanking: () => {
            throw new Error("");
          },
        };
        const errorSpy = jest
          .spyOn(Logger.prototype, "error")
          .mockImplementation(() => undefined);

        const scheduler = new RankingCleanupScheduler(
          rankingRepository as never,
        );
        await scheduler.handleRankingSnapshotCleanup();

        expect(errorSpy).toHaveBeenCalledTimes(1);
        errorSpy.mockRestore();
      });
    });
  });
});
