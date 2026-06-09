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
import { Ranking } from "../ranking/ranking.entity";
import { RankingRepository } from "../ranking/ranking.repository";

@Injectable()
export class ArchiveService {
  constructor(
    @InjectRepository(Drawing)
    private readonly drawingRepository: DrawingRepository,
    @InjectRepository(DailyUserRanking)
    private readonly dailyUserRankingRepository: DailyUserRankingRepository,
    @InjectRepository(Ranking)
    private readonly rankingRepository: RankingRepository,
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

    const todayKey = getSeoulDateKey(getSeoulDayRange().start);
    const dateKeys = [...summaryByDate.keys()];
    const finalizedDateKeys = dateKeys.filter((dateKey) => dateKey < todayKey);
    const rankings =
      await this.dailyUserRankingRepository.findUserRankingsByDates(
        userKey,
        finalizedDateKeys,
      );
    const rankingByDate = new Map(
      rankings.map((ranking) => [
        getSeoulDateKey(ranking.rankingDate),
        ranking,
      ]),
    );

    if (dateKeys.includes(todayKey)) {
      const todayRanking =
        await this.rankingRepository.findMyArchiveRanking(userKey);
      if (todayRanking) {
        rankingByDate.set(todayKey, {
          rankingDate: todayKey,
          drawingId: todayRanking.drawingId,
          score: todayRanking.score,
          rank: todayRanking.rank,
          participantCount: todayRanking.participantCount,
        });
      }
    }

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

    const ranks = rankings.map((ranking) => ranking.rank);

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
    this.validateArchiveDate(dateKey);

    const { start, end } = getSeoulDayRangeByDateKey(dateKey);
    const drawings = await this.drawingRepository.findUserDrawingsInRange(
      userKey,
      start,
      end,
    );

    if (drawings.length === 0) {
      throw new NotFoundException("ARCHIVE_NOT_FOUND");
    }

    const todayKey = getSeoulDateKey(getSeoulDayRange().start);
    const [prompt, ranking] = await Promise.all([
      this.promptService.getPromptByDate(new Date(`${dateKey}T00:00:00.000Z`)),
      dateKey === todayKey
        ? this.rankingRepository.findMyArchiveRanking(userKey)
        : this.dailyUserRankingRepository.findUserRankingByDate(
            userKey,
            dateKey,
          ),
    ]);
    const rankedDrawingId =
      ranking?.drawingId == null ? null : String(ranking.drawingId);

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
        isRankedDrawing: rankedDrawingId === String(drawing.id),
      })),
    };
  }

  private validateArchiveDate(dateKey: string) {
    const todayKey = getSeoulDateKey(getSeoulDayRange().start);
    if (dateKey > todayKey) {
      throw new BadRequestException("ARCHIVE_FUTURE_NOT_ALLOWED");
    }
  }
}

const toIsoString = (value: Date | string) =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString();
