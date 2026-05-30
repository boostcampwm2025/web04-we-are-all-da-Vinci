import { InjectRepository } from "@mikro-orm/nestjs";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  ArchiveDayResponse,
  ArchiveSummaryResponse,
  SimilarityResponse,
  Stroke,
} from "@toss/shared";
import {
  getSeoulDateKey,
  getSeoulDayRange,
  getSeoulDayRangeByDateKey,
} from "src/common/util/time.util";
import { DailyUserRanking } from "../dailyRanking/daily-user-ranking.entity";
import { DailyUserRankingRepository } from "../dailyRanking/daily-user-ranking.repository";
import { Drawing } from "../drawing/drawing.entity";
import { DrawingRepository } from "../drawing/drawing.repository";
import { PromptService } from "../prompt/prompt.service";

@Injectable()
export class ArchiveService {
  constructor(
    @InjectRepository(Drawing)
    private readonly drawingRepository: DrawingRepository,
    @InjectRepository(DailyUserRanking)
    private readonly dailyUserRankingRepository: DailyUserRankingRepository,
    private readonly promptService: PromptService,
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
      await this.dailyUserRankingRepository.findUserRankingsByDates(
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

  async findDay(userKey: number, dateKey: string): Promise<ArchiveDayResponse> {
    this.validateArchivedDate(dateKey);

    const { start, end } = getSeoulDayRangeByDateKey(dateKey);
    const drawings = await this.drawingRepository.findUserDrawingsInRange(
      userKey,
      start,
      end,
    );

    if (drawings.length === 0) {
      throw new NotFoundException("ARCHIVE_NOT_FOUND");
    }

    const [prompt, ranking] = await Promise.all([
      this.promptService.getPromptByDate(new Date(`${dateKey}T00:00:00.000Z`)),
      this.dailyUserRankingRepository.findUserRankingByDate(userKey, dateKey),
    ]);
    const rankedDrawingId = ranking?.drawingId;

    return {
      date: dateKey,
      prompt,
      ranking: ranking
        ? {
            rank: ranking.rank,
            score: ranking.score,
            participantCount: ranking.participantCount,
            drawingId: Number(ranking.drawingId),
          }
        : null,
      drawings: drawings.map((drawing) => ({
        drawingId: Number(drawing.id),
        createdAt: toIsoString(drawing.createdAt),
        strokes: JSON.parse(drawing.strokes) as Stroke[],
        similarity: JSON.parse(drawing.similarity) as SimilarityResponse,
        isRankedDrawing: rankedDrawingId === drawing.id,
      })),
    };
  }

  private validateArchivedDate(dateKey: string) {
    const todayKey = getSeoulDateKey(getSeoulDayRange().start);
    if (dateKey >= todayKey) {
      throw new BadRequestException("ARCHIVE_TODAY_NOT_ALLOWED");
    }
  }
}

const toIsoString = (value: Date | string) =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString();
