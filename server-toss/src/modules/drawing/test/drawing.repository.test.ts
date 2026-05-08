import { MikroOrmModule } from "@mikro-orm/nestjs";
import { Test, TestingModule } from "@nestjs/testing";
import config from "src/mikro-orm.config";
import { DrawingRepository } from "../drawing.repository";
import { MikroORM } from "@mikro-orm/mysql";
import { Drawing } from "../drawing.entity";
import { SmallUserDrawingSeeder } from "src/seeders/small-user-drawing.seeder";
import { User } from "src/modules/user/user.entity";

describe("DrawingRespository", () => {
  let orm: MikroORM;
  let repository: DrawingRepository;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        MikroOrmModule.forRoot(config),
        MikroOrmModule.forFeature({ entities: [Drawing] }),
      ],
      providers: [DrawingRepository],
    }).compile();

    repository = module.get<DrawingRepository>(DrawingRepository);
    orm = module.get<MikroORM>(MikroORM);

    if (orm) {
      await orm.schema.refresh();
      await orm.seeder.seed(SmallUserDrawingSeeder);
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

  describe("Describe: findMyDrawingsWithRank 메소드는", () => {
    describe("Context: 제출한 기록이 있으면", () => {
      let givenUser: User;

      beforeAll(async () => {
        givenUser = (await orm.em.fork().findAll(User, { limit: 1 }))[0];
      });

      it("It: 그림과 랭크를 응답한다.", async () => {
        const result = await repository.findMyDrawingsWithRank(
          givenUser.userKey,
        );

        expect(result).not.toBeNull();
        expect(result.length).toBeGreaterThan(0);
      });
    });

    describe("Context: 제출한 기록이 없으면", () => {
      it("It: 빈 배열을 응답한다.", async () => {
        const result = await repository.findMyDrawingsWithRank(0);

        expect(result).not.toBeNull();
        expect(result.length).toEqual(0);
      });
    });
  });
});
