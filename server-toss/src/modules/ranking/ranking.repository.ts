import { EntityRepository, QueryOrder, sql } from "@mikro-orm/mysql";
import { Ranking } from "./ranking.entity";
import { Drawing } from "../drawing/drawing.entity";
import { User } from "../user/user.entity";
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

  async saveOne(user: User, drawing: Drawing) {
    this.em.create(Ranking, {
      userKey: user.userKey,
      nickname: user.nickname,
      drawingId: drawing.id,
      score: drawing.score,
      strokes: drawing.strokes,
      submittedAt: drawing.createdAt,
    });
    await this.em.flush();
  }

  async cleanupRanking() {
    const { start } = getSeoulDayRange();
    await this.nativeDelete({
      submittedAt: {
        $lt: start,
      },
    });
  }
}
