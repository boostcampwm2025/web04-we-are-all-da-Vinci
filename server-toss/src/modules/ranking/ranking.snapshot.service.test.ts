import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import { QueryOrder } from "@mikro-orm/core";
import { MikroORM } from "@mikro-orm/mysql";
import config from "../../mikro-orm.config";
import { Drawing } from "../drawing/drawing.entity";
import { Ranking } from "./ranking.entity";
import { RankingSnapshotService } from "./ranking.snapshot.service";
import { getSeoulDayRange } from "src/common/time.util";
import { LightSeeder } from "src/seeders/light.seeder";
import { Test, TestingModule } from "@nestjs/testing";
import { MikroOrmModule } from "@mikro-orm/nestjs";

type DrawingWithUser = {
  id: bigint;
  score: number;
  createdAt: Date;
  strokes: string;
  user: {
    id: bigint;
    name: string;
  };
};

type RankingSnapshotRow = {
  name: string;
  strokes: string;
  score: number;
  userId: bigint;
  drawingId: bigint;
  submittedAt: Date;
};

const compareDrawings = (left: DrawingWithUser, right: DrawingWithUser) => {
  if (left.score !== right.score) {
    return right.score - left.score;
  }

  const createdAtDiff = left.createdAt.getTime() - right.createdAt.getTime();
  if (createdAtDiff !== 0) {
    return createdAtDiff;
  }

  if (left.id === right.id) {
    return 0;
  }

  return left.id < right.id ? -1 : 1;
};

const compareSnapshots = (
  left: RankingSnapshotRow,
  right: RankingSnapshotRow,
) => {
  if (left.score !== right.score) {
    return right.score - left.score;
  }

  const submittedAtDiff =
    left.submittedAt.getTime() - right.submittedAt.getTime();
  if (submittedAtDiff !== 0) {
    return submittedAtDiff;
  }

  if (left.name === right.name) {
    return 0;
  }

  return left.name < right.name ? -1 : 1;
};

const groupDrawingsByUser = (drawings: DrawingWithUser[]) => {
  const grouped = new Map<bigint, DrawingWithUser[]>();

  for (const drawing of drawings) {
    const drawingsByUser = grouped.get(drawing.user.id);

    if (drawingsByUser) {
      drawingsByUser.push(drawing);
      continue;
    }

    grouped.set(drawing.user.id, [drawing]);
  }

  return grouped;
};

const pickBestDrawingByUser = (drawings: DrawingWithUser[]) => {
  const grouped = groupDrawingsByUser(drawings);
  const bestByUser = new Map<bigint, DrawingWithUser>();

  for (const [userId, userDrawings] of grouped.entries()) {
    const [best] = [...userDrawings].sort(compareDrawings);
    bestByUser.set(userId, best);
  }

  return bestByUser;
};

const buildExpectedSnapshots = (drawings: DrawingWithUser[]) => {
  const bestByUser = pickBestDrawingByUser(drawings);

  return [...bestByUser.values()]
    .map<RankingSnapshotRow>((drawing) => ({
      name: drawing.user.name,
      strokes: drawing.strokes,
      score: drawing.score,
      userId: drawing.user.id,
      drawingId: drawing.id,
      submittedAt: drawing.createdAt,
    }))
    .sort(compareSnapshots);
};

describe("랭킹 스냅샷 갱신 서비스", () => {
  let orm: MikroORM;
  let service: RankingSnapshotService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        MikroOrmModule.forRoot(config),
        MikroOrmModule.forFeature({ entities: [Ranking] }),
      ],
      providers: [RankingSnapshotService],
    }).compile();

    service = module.get<RankingSnapshotService>(RankingSnapshotService);
    orm = module.get<MikroORM>(MikroORM);
  });

  afterAll(async () => {
    if (orm) {
      await orm.close();
    }
  });
  describe("refreshRankingSnapshot 메소드는", () => {
    describe("drawings 데이터가 있으면", () => {
      beforeAll(async () => {
        if (orm) {
          await orm.schema.refresh();
          await orm.seeder.seed(LightSeeder);
        }
      });
      afterAll(async () => {
        if (orm) {
          await orm.schema.refresh();
        }
      });
      it("유저별 최고 점수 1개씩만 정렬된 랭킹 스냅샷을 생성한다", async () => {
        await service.refreshRankingSnapshot();

        const readEm = orm.em.fork();
        const { start, end } = getSeoulDayRange();

        const drawings = (await readEm.find(
          Drawing,
          {
            createdAt: {
              $gte: start,
              $lt: end,
            },
          },
          {
            populate: ["user"],
          },
        )) as DrawingWithUser[];

        const rankings = await readEm.find(
          Ranking,
          {},
          {
            orderBy: {
              score: QueryOrder.DESC,
              submittedAt: QueryOrder.ASC,
              name: QueryOrder.ASC,
            },
          },
        );

        const actualSnapshots = rankings.map<RankingSnapshotRow>((ranking) => ({
          name: ranking.name,
          strokes: ranking.strokes,
          score: ranking.score,
          userId: ranking.userId,
          drawingId: ranking.drawingId,
          submittedAt: ranking.submittedAt,
        }));

        const expectedSnapshots = buildExpectedSnapshots(drawings);
        const bestByUser = pickBestDrawingByUser(drawings);

        expect(actualSnapshots).toHaveLength(bestByUser.size);
        expect(
          new Set(actualSnapshots.map((ranking) => ranking.userId)).size,
        ).toBe(actualSnapshots.length);

        for (const ranking of actualSnapshots) {
          const bestDrawing = bestByUser.get(ranking.userId);

          expect(bestDrawing).toBeDefined();
          expect(ranking.score).toBe(bestDrawing!.score);
          expect(ranking.submittedAt.toISOString()).toBe(
            bestDrawing!.createdAt.toISOString(),
          );
        }

        expect(actualSnapshots).toEqual(expectedSnapshots);
      });
    });

    describe("이미 갱신 중이면", () => {
      it("중복 갱신을 건너뛴다", async () => {
        const beforeCount = await orm.em.fork().count(Ranking, {});
        (service as unknown as { isRefreshing: boolean }).isRefreshing = true;

        await service.refreshRankingSnapshot();

        const afterCount = await orm.em.fork().count(Ranking, {});

        expect(afterCount).toBe(beforeCount);
      });
    });
  });
});
