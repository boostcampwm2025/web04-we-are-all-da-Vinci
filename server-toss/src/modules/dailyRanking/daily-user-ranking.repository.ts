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
  async findExistingDates(dateKeys: string[]): Promise<Set<string>> {
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

  // 특정 사용자의 특정 날짜들 최종 랭킹 조회
  async findUserRankingsByDates(
    userKey: number,
    dateKeys: string[],
  ): Promise<
    {
      rankingDate: Date | string;
      drawingId: bigint;
      score: number;
      rank: number;
      participantCount: number;
    }[]
  > {
    if (dateKeys.length === 0) {
      return [];
    }

    return this.find(
      {
        userKey,
        rankingDate: {
          $in: dateKeys.map((dateKey) => new Date(`${dateKey}T00:00:00.000Z`)),
        },
      },
      {
        fields: [
          "rankingDate",
          "drawingId",
          "score",
          "rank",
          "participantCount",
        ],
        disableIdentityMap: true,
      },
    );
  }

  async findUserRankingByDate(userKey: number, dateKey: string) {
    return this.findOne(
      {
        userKey,
        rankingDate: new Date(`${dateKey}T00:00:00.000Z`),
      },
      {
        fields: [
          "rankingDate",
          "drawingId",
          "score",
          "rank",
          "participantCount",
        ],
        disableIdentityMap: true,
      },
    );
  }
}
