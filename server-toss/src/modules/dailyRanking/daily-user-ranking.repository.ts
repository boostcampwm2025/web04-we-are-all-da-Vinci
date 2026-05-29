import { EntityRepository } from "@mikro-orm/mysql";
import { getSeoulDateKey } from "src/common/util/time.util";
import { DailyUserRanking } from "./daily-user-ranking.entity";

export interface DailyUserRankingSnapshot {
  rankingDate: Date;
  userKey: number;
  nickname: string;
  drawingId: bigint;
  score: number;
  rank: number;
  participantCount: number;
  submittedAt: Date;
}

export class DailyUserRankingRepository extends EntityRepository<DailyUserRanking> {
  async findExistingDateKeys(dateKeys: string[]): Promise<Set<string>> {
    if (dateKeys.length === 0) {
      return new Set();
    }

    const rankings = await this.find(
      {
        rankingDate: {
          $in: dateKeys.map((dateKey) => new Date(`${dateKey}T00:00:00.000Z`)),
        },
      },
      {
        fields: ["rankingDate"],
        disableIdentityMap: true,
      },
    );

    return new Set(
      rankings.map((ranking) => getSeoulDateKey(ranking.rankingDate)),
    );
  }

  async hasSnapshotForDate(dateKey: string): Promise<boolean> {
    const count = await this.count({
      rankingDate: new Date(`${dateKey}T00:00:00.000Z`),
    });
    return count > 0;
  }

  async saveSnapshots(snapshots: DailyUserRankingSnapshot[]): Promise<void> {
    if (snapshots.length === 0) {
      return;
    }

    const entities = snapshots.map((snapshot) =>
      this.create({
        rankingDate: snapshot.rankingDate,
        userKey: snapshot.userKey,
        nickname: snapshot.nickname,
        drawingId: snapshot.drawingId,
        score: snapshot.score,
        rank: snapshot.rank,
        participantCount: snapshot.participantCount,
        submittedAt: snapshot.submittedAt,
      }),
    );

    this.getEntityManager().persist(entities);
    await this.getEntityManager().flush();
  }
}
