import { EntityRepository, QueryOrder, sql } from "@mikro-orm/mysql";
import { Ranking } from "./ranking.entity";
import { getSeoulDayRange } from "src/common/util/time.util";

export class RankingRepository extends EntityRepository<Ranking> {
  async findTop(limit: number): Promise<Ranking[]> {
    const { start, end } = getSeoulDayRange();
    return await this.find(
      {
        submittedAt: {
          $gte: start,
          $lt: end,
        },
      },
      {
        limit,
        orderBy: [
          {
            score: QueryOrder.DESC,
            submittedAt: QueryOrder.ASC,
          },
        ],
      },
    );
  }

  // 오늘(KST) 랭킹에 제출된 전체 참가자 수. podium 응답에 함께 실어 도전 전에도 노출한다.
  async countTodayParticipants(): Promise<number> {
    const { start, end } = getSeoulDayRange();
    return await this.count({
      submittedAt: {
        $gte: start,
        $lt: end,
      },
    });
  }

  async findLatestUpdatedAt(): Promise<Date | null> {
    const [ranking] = await this.find(
      {},
      {
        limit: 1,
        orderBy: {
          updatedAt: QueryOrder.DESC,
        },
      },
    );

    return ranking?.updatedAt ?? null;
  }

  async findMyRanking(userKey: number) {
    const { start, end } = getSeoulDayRange();
    const ranking = await this.createQueryBuilder("r")
      .select([
        "r.score",
        sql`(
          SELECT count(*) + 1
          FROM rankings AS r2
          WHERE r2.submitted_at >= ${start} AND r2.submitted_at < ${end}
            AND (r2.score > r.score 
              OR (r2.score = r.score AND r2.submitted_at < r.submitted_at)))`.as(
          "rank",
        ),
      ])
      .where({
        userKey: userKey,
        submittedAt: {
          $gte: start,
          $lt: end,
        },
      })
      .execute<{ rank: number; score: number }[]>();

    if (ranking.length < 1) return null;
    return ranking[0];
  }

  async findMyArchiveRanking(userKey: number) {
    const { start, end } = getSeoulDayRange();
    const ranking = await this.createQueryBuilder("r")
      .select([
        "r.drawingId",
        "r.score",
        sql`(
          SELECT count(*) + 1
          FROM rankings AS r2
          WHERE r2.submitted_at >= ${start} AND r2.submitted_at < ${end}
            AND (r2.score > r.score
              OR (r2.score = r.score AND r2.submitted_at < r.submitted_at)))`.as(
          "rank",
        ),
        sql`(
          SELECT count(*)
          FROM rankings AS r3
          WHERE r3.submitted_at >= ${start} AND r3.submitted_at < ${end}
        )`.as("participantCount"),
      ])
      .where({
        userKey,
        submittedAt: {
          $gte: start,
          $lt: end,
        },
      })
      .execute<
        {
          drawingId: bigint;
          rank: number;
          score: number;
          participantCount: number;
        }[]
      >();

    if (ranking.length < 1) return null;
    return ranking[0];
  }

  async findByUserKey(userKey: number): Promise<Ranking | null> {
    const { start, end } = getSeoulDayRange();
    return await this.em.findOne(Ranking, {
      userKey: userKey,
      submittedAt: {
        $gte: start,
        $lt: end,
      },
    });
  }

  /**
   * 트리거 사용자가 oldScore → newScore로 올랐을 때 추월된 사용자 목록.
   * 범위: oldScore <= score < newScore. 정렬: 영향 큰 순서로 score DESC.
   * case 1(신규 진입)은 oldScore = -1로 호출.
   * TOP100 안 식별: limit으로 잘라낸다.
   */
  async findOvertakenUserKeys(input: {
    oldScore: number;
    newScore: number;
    excludeUserKey: number;
    limit: number;
  }): Promise<number[]> {
    const { start, end } = getSeoulDayRange();
    const rows = await this.em.execute<{ user_key: number }[]>(
      "select user_key from rankings " +
        "where submitted_at >= ? and submitted_at < ? " +
        "and score < ? and score >= ? " +
        "and user_key != ? " +
        "order by score desc, submitted_at asc " +
        "limit ?",
      [
        start,
        end,
        input.newScore,
        input.oldScore,
        input.excludeUserKey,
        input.limit,
      ],
    );
    return rows.map((row) => row.user_key);
  }
}
