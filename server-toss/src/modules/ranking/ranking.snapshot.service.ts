import { QueryOrder, type RequiredEntityData } from "@mikro-orm/core";
import { EntityManager, sql } from "@mikro-orm/mysql";
import { Injectable, Logger } from "@nestjs/common";
import { Drawing } from "src/modules/drawing/drawing.entity";
import { Ranking } from "./ranking.entity";
import { getSeoulDayRange } from "src/common/time.util";
import { CreateRequestContext } from "@mikro-orm/decorators/legacy";

type RankingSnapshotInsert = RequiredEntityData<Ranking>;

@Injectable()
export class RankingSnapshotService {
  private readonly logger = new Logger(RankingSnapshotService.name);
  private isRefreshing = false;

  constructor(private readonly em: EntityManager) {}

  @CreateRequestContext()
  async refreshRankingSnapshot() {
    if (this.isRefreshing) {
      this.logger.warn(
        { event: "ranking.snapshot.refresh.skipped" },
        "랭킹 스냅샷 갱신 중복 요청 스킵",
      );
      return;
    }

    this.isRefreshing = true;
    const startedAt = Date.now();
    const { start, end } = getSeoulDayRange();
    let insertedCount = 0;

    this.logger.log(
      {
        event: "ranking.snapshot.refresh.started",
        rangeStart: start.toISOString(),
        rangeEnd: end.toISOString(),
      },
      "랭킹 스냅샷 갱신 시작",
    );

    try {
      await this.em.transactional(async (transactionalEm) => {
        const rankedDrawingsQb = transactionalEm
          .createQueryBuilder(Drawing, "d")
          .select([
            "d.id",
            "d.score",
            "d.createdAt",
            "d.user",
            sql`u.name`.as("user_name"),
            sql`
      row_number() over (
        partition by d.user_key
        order by d.score desc, d.created_at asc, d.id asc
      )
    `.as("rank_no"),
          ])
          .leftJoin("d.user", "u")
          .where({
            createdAt: {
              $gte: start,
              $lt: end,
            },
          });

        const rows = await transactionalEm
          .createQueryBuilder(Drawing)
          .with("ranked_drawings", rankedDrawingsQb)
          .select([sql`rd.id`])
          .from("ranked_drawings", "rd")
          .where("rd.rank_no = ?", [1])
          .orderBy({
            [sql`rd.score`]: QueryOrder.DESC,
            [sql`rd.created_at`]: QueryOrder.ASC,
            [sql`rd.user_name`]: QueryOrder.ASC,
          })
          .execute<{ id: bigint }[]>();

        const ids = rows.map((row) => row.id);

        const drawings = await transactionalEm.find(
          Drawing,
          { id: { $in: ids } },
          { populate: ["user"] },
        );

        const orderMap = new Map(ids.map((id, index) => [id, index]));

        drawings.sort((a, b) => orderMap.get(a.id)! - orderMap.get(b.id)!);

        const snapshotTime = new Date();
        const rankings = drawings.map<RankingSnapshotInsert>((drawing) => {
          return {
            name: drawing.user.name,
            strokes: drawing.strokes,
            score: drawing.score,
            userKey: drawing.user.userKey,
            drawingId: drawing.id,
            submittedAt: drawing.createdAt,
            createdAt: snapshotTime,
            updatedAt: snapshotTime,
          };
        });

        const rankingRepository = transactionalEm.getRepository(Ranking);
        await rankingRepository.nativeDelete({});

        if (rankings.length > 0) {
          await rankingRepository.insertMany(rankings);
        }

        insertedCount = rankings.length;
      });
      this.logger.log(
        {
          event: "ranking.snapshot.refresh.succeeded",
          insertedCount,
          durationMs: Date.now() - startedAt,
        },
        "랭킹 스냅샷 갱신 성공",
      );
    } catch (err) {
      this.logger.error(
        {
          event: "ranking.snapshot.refresh.failed",
          insertedCount,
          durationMs: Date.now() - startedAt,
          err,
        },
        "랭킹 스냅샷 갱신 실패",
      );
      throw err;
    } finally {
      this.isRefreshing = false;
    }
  }
}
