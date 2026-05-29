import { InjectRepository } from "@mikro-orm/nestjs";
import { Injectable, Logger } from "@nestjs/common";
import {
  DAY_DURATION_MS,
  getSeoulDateKey,
  getSeoulDayRange,
  getSeoulDayRangeByDateKey,
} from "src/common/util/time.util";
import { Drawing } from "../drawing/drawing.entity";
import { DrawingRepository } from "../drawing/drawing.repository";
import { DailyUserRanking } from "./daily-user-ranking.entity";
import {
  DailyUserRankingRepository,
  type DailyUserRankingSnapshot,
} from "./daily-user-ranking.repository";

export interface SnapshotResult {
  dateKey: string;
  skipped: boolean;
  savedCount: number;
}

@Injectable()
export class DailyRankingSnapshotService {
  private readonly logger = new Logger(DailyRankingSnapshotService.name);

  constructor(
    @InjectRepository(Drawing)
    private readonly drawingRepository: DrawingRepository,
    @InjectRepository(DailyUserRanking)
    private readonly dailyUserRankingRepository: DailyUserRankingRepository,
  ) {}

  async backfillMissingSnapshots(reference = new Date()): Promise<{
    targetDateCount: number;
    createdDateCount: number;
    savedRankingCount: number;
  }> {
    const dateKeys =
      await this.drawingRepository.findCompletedDrawingDateKeys(reference);
    const existingDateKeys =
      await this.dailyUserRankingRepository.findExistingDateKeys(dateKeys);
    const missingDateKeys = dateKeys.filter(
      (dateKey) => !existingDateKeys.has(dateKey),
    );

    let savedRankingCount = 0;
    for (const dateKey of missingDateKeys) {
      const result = await this.createSnapshotForDate(dateKey);
      savedRankingCount += result.savedCount;
    }

    if (missingDateKeys.length > 0) {
      this.logger.log(
        {
          event: "daily_ranking.snapshot.backfill.succeeded",
          targetDateCount: dateKeys.length,
          createdDateCount: missingDateKeys.length,
          savedRankingCount,
        },
        "Backfilled missing daily ranking snapshots.",
      );
    }

    return {
      targetDateCount: dateKeys.length,
      createdDateCount: missingDateKeys.length,
      savedRankingCount,
    };
  }

  async createYesterdaySnapshot(
    reference = new Date(),
  ): Promise<SnapshotResult> {
    const { start: todayStart } = getSeoulDayRange(reference);
    const yesterdayKey = getSeoulDateKey(
      new Date(todayStart.getTime() - DAY_DURATION_MS),
    );

    return this.createSnapshotForDate(yesterdayKey);
  }

  async createSnapshotForDate(dateKey: string): Promise<SnapshotResult> {
    const exists =
      await this.dailyUserRankingRepository.hasSnapshotForDate(dateKey);
    if (exists) {
      return { dateKey, skipped: true, savedCount: 0 };
    }

    const snapshots = await this.buildSnapshotsForDate(dateKey);
    await this.dailyUserRankingRepository.saveSnapshots(snapshots);

    return { dateKey, skipped: false, savedCount: snapshots.length };
  }

  async buildSnapshotsForDate(
    dateKey: string,
  ): Promise<DailyUserRankingSnapshot[]> {
    const { start, end } = getSeoulDayRangeByDateKey(dateKey);
    const drawings = await this.drawingRepository.findDrawingsByCreatedAtRange(
      start,
      end,
    );
    const bestDrawingByUser = new Map<number, Drawing>();

    for (const drawing of drawings) {
      if (!bestDrawingByUser.has(drawing.user.userKey)) {
        bestDrawingByUser.set(drawing.user.userKey, drawing);
      }
    }

    const rankingDate = new Date(`${dateKey}T00:00:00.000Z`);
    const bestDrawings = [...bestDrawingByUser.values()];
    const participantCount = bestDrawings.length;

    return bestDrawings.map((drawing, index) => ({
      rankingDate,
      userKey: drawing.user.userKey,
      nickname: drawing.user.nickname,
      drawingId: drawing.id,
      score: drawing.score,
      rank: index + 1,
      participantCount,
      submittedAt: drawing.createdAt,
    }));
  }
}
