import { EntityRepository, QueryOrder, sql } from "@mikro-orm/mysql";
import { Drawing } from "./drawing.entity";
import { getSeoulDayRange } from "src/common/util/time.util";

export class DrawingRepository extends EntityRepository<Drawing> {
  async findTodayByUser(userKey: number): Promise<Drawing[]> {
    const { start, end } = getSeoulDayRange();
    return this.em.find(
      Drawing,
      { user: userKey, createdAt: { $gte: start, $lt: end } },
      {
        populate: ["user", "prompt"],
        orderBy: [{ score: QueryOrder.DESC }],
      },
    );
  }

  async findMyDrawingsWithRank(userKey: number) {
    const { start, end } = getSeoulDayRange();

    const myDrawingsWithRank = await this.em
      .createQueryBuilder(Drawing, "d")
      .select([
        "d.id",
        "d.score",
        "d.strokes",
        "d.similarity",
        sql`u.nickname`,
        sql`(
          SELECT count(*) + 1 
          FROM drawings AS d2 
          WHERE d2.created_at >= ${start} AND d2.created_at < ${end}
            AND (d2.score > d.score OR (d2.score = d.score AND d2.created_at < d.created_at))
        )`.as("rank"),
      ])
      .innerJoin("d.user", "u")
      .where({
        "d.user": userKey,
        "d.createdAt": { $gte: start, $lt: end },
      })
      .orderBy({ createdAt: QueryOrder.DESC })
      .execute<
        {
          id: bigint;
          rank: number;
          strokes: string;
          similarity: string;
          nickname: string;
        }[]
      >();

    return myDrawingsWithRank;
  }
}
