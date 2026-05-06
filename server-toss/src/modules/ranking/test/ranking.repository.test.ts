import { afterAll, beforeAll, describe, it } from "@jest/globals";
import { MikroORM, QueryOrder } from "@mikro-orm/mysql";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { Test, TestingModule } from "@nestjs/testing";
import { User } from "src/modules/user/user.entity";
import { RankingSeeder } from "src/seeders/ranking.seeder";
import { SmallUserDrawingSeeder } from "src/seeders/small-user-drawing.seeder";
import config from "../../../mikro-orm.config";
import { Ranking } from "../ranking.entity";
import { RankingRepository } from "../ranking.repository";

describe("RankingRepository", () => {
  let orm: MikroORM;
  let repository: RankingRepository;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        MikroOrmModule.forRoot(config),
        MikroOrmModule.forFeature({ entities: [Ranking] }),
      ],
      providers: [RankingRepository],
    }).compile();

    repository = module.get<RankingRepository>(RankingRepository);
    orm = module.get<MikroORM>(MikroORM);

    if (orm) {
      await orm.schema.refresh();
      await orm.seeder.seed(SmallUserDrawingSeeder);
      await orm.seeder.seed(RankingSeeder);
    }
  });

  afterAll(async () => {
    if (orm) {
      await orm.schema.refresh();
      await orm.close();
    }
    if (module) {
      await module.close();
    }
  });

  describe("Describe: findMyRanking 메소드는", () => {
    describe("Context: 제출한 기록이 있으면", () => {
      let givenUser: User;
      let givenRank: number;

      beforeAll(async () => {
        givenUser = (await orm.em.fork().findAll(User, { limit: 1 }))[0];
        givenRank = (
          await orm.em.fork().findAll(Ranking, {
            orderBy: {
              score: QueryOrder.DESC,
              submittedAt: QueryOrder.ASC,
              nickname: QueryOrder.ASC,
            },
          })
        ).findIndex((r) => r.userKey === givenUser.userKey);

        givenRank += 1;
      });

      it("It: 순위와 점수를 응답한다.", async () => {
        const result = await repository.findMyRanking(givenUser.userKey);

        expect(result).not.toBeNull();
        expect(result?.rank).toEqual(givenRank);
      });
    });

    describe("Context: 제출한 기록이 없으면", () => {
      it("It: null을 응답한다.", async () => {
        const result = await repository.findMyRanking(0);

        expect(result).toBeNull();
      });
    });
  });
});
