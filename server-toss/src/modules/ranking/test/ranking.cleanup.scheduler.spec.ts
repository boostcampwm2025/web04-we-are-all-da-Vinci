import { Logger } from "@nestjs/common";
import { describe, expect, it, jest } from "@jest/globals";
jest.mock("@nestjs/schedule", () => ({
  Cron: () => () => undefined,
  CronExpression: {
    EVERY_DAY_AT_MIDNIGHT: "0 0 * * *",
  },
}));

import { RankingCleanupScheduler } from "../ranking.cleanup.scheduler";

describe("랭킹 정리 스케줄러", () => {
  describe("handleRankingSnapshotCleanup 메소드는", () => {
    describe("실행되면", () => {
      it("어제 랭킹 스냅샷을 저장한 뒤 기존 랭킹을 정리한다", async () => {
        const cleanupRanking = jest.fn().mockResolvedValue(undefined as never);
        const createYesterdaySnapshot = jest.fn().mockResolvedValue({
          dateKey: "2026-05-28",
          skipped: false,
          savedCount: 1,
        });

        const scheduler = new RankingCleanupScheduler(
          {} as never,
          { cleanupRanking } as never,
          { createYesterdaySnapshot } as never,
        );
        await scheduler.handleRankingSnapshotCleanup();

        expect(createYesterdaySnapshot).toHaveBeenCalledTimes(1);
        expect(cleanupRanking).toHaveBeenCalledTimes(1);
      });
    });

    describe("실행에 실패하면", () => {
      it("에러 로그를 기록한다", async () => {
        const cleanupRanking = jest.fn().mockRejectedValue(new Error(""));
        const createYesterdaySnapshot = jest.fn().mockResolvedValue({
          dateKey: "2026-05-28",
          skipped: false,
          savedCount: 1,
        });
        const errorSpy = jest
          .spyOn(Logger.prototype, "error")
          .mockImplementation(() => undefined);

        const scheduler = new RankingCleanupScheduler(
          {} as never,
          { cleanupRanking } as never,
          { createYesterdaySnapshot } as never,
        );
        await scheduler.handleRankingSnapshotCleanup();

        expect(errorSpy).toHaveBeenCalledTimes(1);
        errorSpy.mockRestore();
      });

      it("스냅샷 저장이 실패하면 기존 랭킹을 삭제하지 않는다", async () => {
        const cleanupRanking = jest.fn().mockResolvedValue(undefined);
        const createYesterdaySnapshot = jest
          .fn()
          .mockRejectedValue(new Error(""));
        const errorSpy = jest
          .spyOn(Logger.prototype, "error")
          .mockImplementation(() => undefined);

        const scheduler = new RankingCleanupScheduler(
          {} as never,
          { cleanupRanking } as never,
          { createYesterdaySnapshot } as never,
        );
        await scheduler.handleRankingSnapshotCleanup();

        expect(cleanupRanking).not.toHaveBeenCalled();
        expect(errorSpy).toHaveBeenCalledTimes(1);
        errorSpy.mockRestore();
      });
    });
  });
});
