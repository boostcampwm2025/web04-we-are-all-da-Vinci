import { describe, expect, it, jest } from "@jest/globals";
import { DailyRankingSnapshotService } from "../daily-ranking-snapshot.service";

const createService = ({
  drawingRepository = {},
  dailyUserRankingRepository = {},
}: {
  drawingRepository?: Record<string, unknown>;
  dailyUserRankingRepository?: Record<string, unknown>;
}) =>
  new DailyRankingSnapshotService(
    drawingRepository as never,
    dailyUserRankingRepository as never,
  );

describe("일별 랭킹 스냅샷 서비스", () => {
  describe("buildSnapshotsForDate 메소드는", () => {
    it("날짜별 그림에서 사용자별 최고 기록만 순위로 저장할 형태로 변환한다", async () => {
      const firstUser = { userKey: 1, nickname: "첫번째" };
      const secondUser = { userKey: 2, nickname: "두번째" };
      const firstSubmittedAt = new Date("2026-05-27T01:00:00.000Z");
      const secondSubmittedAt = new Date("2026-05-27T02:00:00.000Z");
      const drawingRepository = {
        findDrawingsByCreatedAtRange: jest.fn().mockResolvedValue([
          {
            id: BigInt(2),
            user: secondUser,
            score: 95,
            createdAt: secondSubmittedAt,
          },
          {
            id: BigInt(1),
            user: firstUser,
            score: 90,
            createdAt: firstSubmittedAt,
          },
          {
            id: BigInt(3),
            user: firstUser,
            score: 80,
            createdAt: new Date("2026-05-27T03:00:00.000Z"),
          },
        ]),
      };
      const service = createService({ drawingRepository });

      const snapshots = await service.buildSnapshotsForDate("2026-05-27");

      expect(snapshots).toEqual([
        {
          rankingDate: new Date("2026-05-27T00:00:00.000Z"),
          userKey: 2,
          nickname: "두번째",
          drawingId: BigInt(2),
          score: 95,
          rank: 1,
          participantCount: 2,
          submittedAt: secondSubmittedAt,
        },
        {
          rankingDate: new Date("2026-05-27T00:00:00.000Z"),
          userKey: 1,
          nickname: "첫번째",
          drawingId: BigInt(1),
          score: 90,
          rank: 2,
          participantCount: 2,
          submittedAt: firstSubmittedAt,
        },
      ]);
    });
  });

  describe("backfillMissingSnapshots 메소드는", () => {
    it("이미 스냅샷이 있는 날짜는 건너뛰고 누락 날짜만 저장한다", async () => {
      const drawingRepository = {
        findPastSubmissionDates: jest
          .fn()
          .mockResolvedValue(["2026-05-26", "2026-05-27"]),
        findDrawingsByCreatedAtRange: jest.fn().mockResolvedValue([
          {
            id: BigInt(1),
            user: { userKey: 1, nickname: "첫번째" },
            score: 90,
            createdAt: new Date("2026-05-27T01:00:00.000Z"),
          },
        ]),
      };
      const saveSnapshots = jest.fn().mockResolvedValue(undefined);
      const dailyUserRankingRepository = {
        findExistingDates: jest.fn().mockResolvedValue(new Set(["2026-05-26"])),
        hasSnapshotForDate: jest.fn().mockResolvedValue(false),
        saveSnapshots,
      };
      const service = createService({
        drawingRepository,
        dailyUserRankingRepository,
      });

      const result = await service.backfillMissingSnapshots(
        new Date("2026-05-28T00:00:00.000Z"),
      );

      expect(result).toEqual({
        targetDateCount: 2,
        createdDateCount: 1,
        savedRankingCount: 1,
      });
      expect(saveSnapshots).toHaveBeenCalledTimes(1);
    });
  });

  describe("createSnapshotForDate 메소드는", () => {
    it("이미 스냅샷이 있으면 저장하지 않는다", async () => {
      const saveSnapshots = jest.fn().mockResolvedValue(undefined);
      const service = createService({
        drawingRepository: {
          findDrawingsByCreatedAtRange: jest.fn(),
        },
        dailyUserRankingRepository: {
          hasSnapshotForDate: jest.fn().mockResolvedValue(true),
          saveSnapshots,
        },
      });

      const result = await service.createSnapshotForDate("2026-05-27");

      expect(result).toEqual({
        dateKey: "2026-05-27",
        skipped: true,
        savedCount: 0,
      });
      expect(saveSnapshots).not.toHaveBeenCalled();
    });
  });
});
