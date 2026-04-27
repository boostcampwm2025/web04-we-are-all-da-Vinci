import {
  EntityManager,
  QueryOrder,
  type RequiredEntityData,
} from "@mikro-orm/core";
import { Injectable } from "@nestjs/common";
import { Drawing } from "src/modules/drawing/drawing.entity";
import { Ranking } from "./ranking.entity";
import { getSeoulDayRange } from "src/common/time.util";

type RankingSnapshotInsert = RequiredEntityData<Ranking>;

@Injectable()
export class RankingSnapshotService {
  private isRefreshing = false;

  constructor(private readonly em: EntityManager) {}

  async refreshRankingSnapshot() {
    if (this.isRefreshing) {
      return;
    }

    this.isRefreshing = true;
    const { start, end } = getSeoulDayRange();

    try {
      await this.em.transactional(async (transactionalEm) => {
        const drawings = await transactionalEm.find(
          Drawing,
          {
            createdAt: {
              $gte: start,
              $lt: end,
            },
          },
          {
            populate: ["user"],
            orderBy: [
              {
                score: QueryOrder.DESC,
                createdAt: QueryOrder.ASC,
                user: { name: QueryOrder.ASC },
              },
            ],
            limit: 100,
          },
        );

        const snapshotTime = new Date();
        const rankings = drawings.map<RankingSnapshotInsert>((drawing) => {
          return {
            name: drawing.user.name,
            strokes: drawing.strokes,
            score: drawing.score,
            userId: drawing.user.id,
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
      });
    } finally {
      this.isRefreshing = false;
    }
  }
}
