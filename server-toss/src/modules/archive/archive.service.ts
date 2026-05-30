import { InjectRepository } from "@mikro-orm/nestjs";
import { Injectable } from "@nestjs/common";
import type { ArchiveSummaryResponse } from "@toss/shared";
import { getSeoulDateKey } from "src/common/util/time.util";
import { DailyUserRanking } from "../dailyRanking/daily-user-ranking.entity";
import { DailyUserRankingRepository } from "../dailyRanking/daily-user-ranking.repository";
import { Drawing } from "../drawing/drawing.entity";
import { DrawingRepository } from "../drawing/drawing.repository";

@Injectable()
export class ArchiveService {
  constructor(
    @InjectRepository(Drawing)
    private readonly drawingRepository: DrawingRepository,
    @InjectRepository(DailyUserRanking)
    private readonly dailyUserRankingRepository: DailyUserRankingRepository,
  ) {}

  async findSummary(userKey: number): Promise<ArchiveSummaryResponse> {
    const drawings =
      await this.drawingRepository.findArchivedDrawingsByUser(userKey);

    if (drawings.length === 0) {
      return {
        dates: [],
        stats: {
          totalDrawingCount: 0,
          playDays: 0,
          bestScore: null,
          bestRank: null,
        },
      };
    }

    const summaryByDate = new Map<
      string,
      { date: string; drawingCount: number; bestScore: number }
    >();

    for (const drawing of drawings) {
      const date = getSeoulDateKey(drawing.createdAt);
      const summary = summaryByDate.get(date);

      if (!summary) {
        summaryByDate.set(date, {
          date,
          drawingCount: 1,
          bestScore: drawing.score,
        });
        continue;
      }

      summary.drawingCount += 1;
      summary.bestScore = Math.max(summary.bestScore, drawing.score);
    }

    const dateKeys = [...summaryByDate.keys()];
    const rankings =
      await this.dailyUserRankingRepository.findByUserKeyAndDateKeys(
        userKey,
        dateKeys,
      );
    const rankingByDate = new Map(
      rankings.map((ranking) => [
        getSeoulDateKey(ranking.rankingDate),
        ranking,
      ]),
    );

    const dates = [...summaryByDate.values()]
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((summary) => {
        const ranking = rankingByDate.get(summary.date);

        return {
          ...summary,
          rank: ranking?.rank ?? null,
          participantCount: ranking?.participantCount ?? null,
        };
      });

    const ranks = dates
      .map((date) => date.rank)
      .filter((rank): rank is number => rank !== null);

    return {
      dates,
      stats: {
        totalDrawingCount: drawings.length,
        playDays: dates.length,
        bestScore: Math.max(...drawings.map((drawing) => drawing.score)),
        bestRank: ranks.length > 0 ? Math.min(...ranks) : null,
      },
    };
  }
}
