import { describe, expect, it, jest } from "@jest/globals";
import { ArchiveService } from "../archive.service";

const createService = ({
  drawingRepository = {},
  dailyUserRankingRepository = {},
}: {
  drawingRepository?: Record<string, unknown>;
  dailyUserRankingRepository?: Record<string, unknown>;
}) =>
  new ArchiveService(
    drawingRepository as never,
    dailyUserRankingRepository as never,
  );

describe("아카이브 서비스", () => {
  describe("findSummary 메소드는", () => {
    it("과거 그림이 없으면 빈 요약을 반환한다", async () => {
      const service = createService({
        drawingRepository: {
          findArchivedDrawingsByUser: jest.fn().mockResolvedValue([]),
        },
        dailyUserRankingRepository: {
          findByUserKeyAndDateKeys: jest.fn(),
        },
      });

      const result = await service.findSummary(1234);

      expect(result).toEqual({
        dates: [],
        stats: {
          totalDrawingCount: 0,
          playDays: 0,
          bestScore: null,
          bestRank: null,
        },
      });
    });

    it("날짜별 그림 수와 최고점, 최종 랭킹을 반환한다", async () => {
      const findByUserKeyAndDateKeys = jest.fn().mockResolvedValue([
        {
          rankingDate: "2026-05-27",
          drawingId: BigInt(1),
          score: 90,
          rank: 3,
          participantCount: 10,
        },
      ]);
      const service = createService({
        drawingRepository: {
          findArchivedDrawingsByUser: jest.fn().mockResolvedValue([
            {
              id: BigInt(1),
              score: 90,
              createdAt: new Date("2026-05-27T01:00:00.000Z"),
            },
            {
              id: BigInt(2),
              score: 80,
              createdAt: new Date("2026-05-27T02:00:00.000Z"),
            },
            {
              id: BigInt(3),
              score: 70,
              createdAt: new Date("2026-05-26T01:00:00.000Z"),
            },
          ]),
        },
        dailyUserRankingRepository: {
          findByUserKeyAndDateKeys,
        },
      });

      const result = await service.findSummary(1234);

      expect(findByUserKeyAndDateKeys).toHaveBeenCalledWith(1234, [
        "2026-05-27",
        "2026-05-26",
      ]);
      expect(result).toEqual({
        dates: [
          {
            date: "2026-05-27",
            drawingCount: 2,
            bestScore: 90,
            rank: 3,
            participantCount: 10,
          },
          {
            date: "2026-05-26",
            drawingCount: 1,
            bestScore: 70,
            rank: null,
            participantCount: null,
          },
        ],
        stats: {
          totalDrawingCount: 3,
          playDays: 2,
          bestScore: 90,
          bestRank: 3,
        },
      });
    });
  });
});
