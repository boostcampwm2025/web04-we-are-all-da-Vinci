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

    const rankedQb = this.em
      .createQueryBuilder(Drawing, "d")
      .select([
        "d.id",
        sql`u.user_key`,
        "d.score",
        "d.similarity",
        "d.strokes",
        "d.createdAt",
        sql`u.nickname`,
        sql`row_number() over (
        order by d.score desc, d.created_at asc, u.nickname asc
      )`.as("rank"),
      ])
      .leftJoin("d.user", "u")
      .where({
        createdAt: {
          $gte: start,
          $lt: end,
        },
      });

    const myDrawings = await this.em
      .createQueryBuilder(Drawing, "d")
      .with("ranked_drawings", rankedQb)
      .select([
        sql`rd.id`,
        sql`rd.score`,
        sql`rd.strokes`,
        sql`rd.similarity`,
        sql`rd.nickname`,
        sql`rd.rank`,
      ])
      .from("ranked_drawings", "rd")
      .where({ [sql`rd.user_key`]: userKey })
      .orderBy({
        [sql`rd.created_at`]: QueryOrder.DESC,
      })
      .execute<
        {
          id: bigint;
          rank: number;
          strokes: string;
          similarity: string;
          nickname: string;
        }[]
      >();

    return myDrawings;
  }
}
