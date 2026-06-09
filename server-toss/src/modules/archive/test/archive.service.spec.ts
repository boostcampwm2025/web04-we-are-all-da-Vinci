import { describe, expect, it, jest } from "@jest/globals";
import { getSeoulDateKey, getSeoulDayRange } from "src/common/util/time.util";
import { ArchiveService } from "../archive.service";

const createService = ({
  drawingRepository = {},
  dailyUserRankingRepository = {},
  rankingRepository = {},
  promptService = {},
}: {
  drawingRepository?: Record<string, unknown>;
  dailyUserRankingRepository?: Record<string, unknown>;
  rankingRepository?: Record<string, unknown>;
  promptService?: Record<string, unknown>;
}) =>
  new ArchiveService(
    drawingRepository as never,
    dailyUserRankingRepository as never,
    rankingRepository as never,
    promptService as never,
  );

describe("아카이브 서비스", () => {
  describe("findSummary 메소드는", () => {
    it("과거 그림이 없으면 빈 요약을 반환한다", async () => {
      const service = createService({
        drawingRepository: {
          findArchivedDrawingsByUser: jest.fn().mockResolvedValue([]),
        },
        dailyUserRankingRepository: {
          findUserRankingsByDates: jest.fn(),
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
      const findUserRankingsByDates = jest.fn().mockResolvedValue([
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
          findUserRankingsByDates,
        },
      });

      const result = await service.findSummary(1234);

      expect(findUserRankingsByDates).toHaveBeenCalledWith(1234, [
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

    it("오늘 이후 날짜는 조회하지 않는다", async () => {
      const service = createService({});

      await expect(service.findDay(1234, "9999-01-01")).rejects.toThrow(
        "ARCHIVE_FUTURE_NOT_ALLOWED",
      );
    });

    it("해당 날짜 그림이 없으면 예외를 던진다", async () => {
      const service = createService({
        drawingRepository: {
          findUserDrawingsInRange: jest.fn().mockResolvedValue([]),
        },
      });

      await expect(service.findDay(1234, "2000-01-01")).rejects.toThrow(
        "ARCHIVE_NOT_FOUND",
      );
    });

    it("날짜별 제시그림, 내 그림, 최종 랭킹을 반환한다", async () => {
      const service = createService({
        drawingRepository: {
          findUserDrawingsInRange: jest.fn().mockResolvedValue([
            {
              id: BigInt(1),
              strokes: JSON.stringify([
                { points: [[1], [1]], color: [0, 0, 0] },
              ]),
              similarity: JSON.stringify({
                score: 90,
                shapeSimilarity: 80,
                strokeMatchSimilarity: 95,
                penalty: 5,
              }),
              score: 90,
              createdAt: new Date("2000-01-01T01:00:00.000Z"),
            },
          ]),
        },
        dailyUserRankingRepository: {
          findUserRankingByDate: jest.fn().mockResolvedValue({
            rankingDate: "2000-01-01",
            drawingId: BigInt(1),
            score: 90,
            rank: 3,
            participantCount: 10,
          }),
        },
        promptService: {
          getPromptByDate: jest.fn().mockResolvedValue({
            promptId: 7,
            strokes: [{ points: [[2], [2]], color: [255, 0, 0] }],
          }),
        },
      });

      const result = await service.findDay(1234, "2000-01-01");

      expect(result).toEqual({
        date: "2000-01-01",
        prompt: {
          promptId: 7,
          strokes: [{ points: [[2], [2]], color: [255, 0, 0] }],
        },
        ranking: {
          rank: 3,
          score: 90,
          participantCount: 10,
          drawingId: 1,
        },
        drawings: [
          {
            drawingId: 1,
            createdAt: "2000-01-01T01:00:00.000Z",
            strokes: [{ points: [[1], [1]], color: [0, 0, 0] }],
            similarity: {
              score: 90,
              shapeSimilarity: 80,
              strokeMatchSimilarity: 95,
              penalty: 5,
            },
            isRankedDrawing: true,
          },
        ],
      });
    });

    it("오늘 기록은 현재 랭킹 테이블 기준 등수를 반환한다", async () => {
      const todayKey = getSeoulDateKey(getSeoulDayRange().start);
      const findMyArchiveRanking = jest.fn().mockResolvedValue({
        drawingId: BigInt(1),
        score: 90,
        rank: 1,
        participantCount: 5,
      });
      const findUserRankingByDate = jest.fn();
      const service = createService({
        drawingRepository: {
          findUserDrawingsInRange: jest.fn().mockResolvedValue([
            {
              id: BigInt(1),
              strokes: JSON.stringify([
                { points: [[1], [1]], color: [0, 0, 0] },
              ]),
              similarity: JSON.stringify({
                score: 90,
                shapeSimilarity: 80,
                strokeMatchSimilarity: 95,
                penalty: 5,
              }),
              score: 90,
              createdAt: new Date(`${todayKey}T01:00:00.000Z`),
            },
          ]),
        },
        dailyUserRankingRepository: {
          findUserRankingByDate,
        },
        rankingRepository: {
          findMyArchiveRanking,
        },
        promptService: {
          getPromptByDate: jest.fn().mockResolvedValue({
            promptId: 7,
            strokes: [{ points: [[2], [2]], color: [255, 0, 0] }],
          }),
        },
      });

      const result = await service.findDay(1234, todayKey);

      expect(findMyArchiveRanking).toHaveBeenCalledWith(1234);
      expect(findUserRankingByDate).not.toHaveBeenCalled();
      expect(result.ranking).toEqual({
        rank: 1,
        score: 90,
        participantCount: 5,
        drawingId: 1,
      });
      expect(result.drawings[0]?.isRankedDrawing).toBe(true);
    });
  });
});
