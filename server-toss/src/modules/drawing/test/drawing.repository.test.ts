import { MikroOrmModule } from "@mikro-orm/nestjs";
import { Test, TestingModule } from "@nestjs/testing";
import config from "src/mikro-orm.config";
import { DrawingRepository } from "../drawing.repository";
import { MikroORM } from "@mikro-orm/mysql";
import { Drawing } from "../drawing.entity";
import { SmallUserDrawingSeeder } from "src/seeders/small-user-drawing.seeder";
import { User } from "src/modules/user/user.entity";
import { Prompt } from "src/modules/prompt/prompt.entity";

describe("DrawingRespository", () => {
  let orm: MikroORM;
  let repository: DrawingRepository;
  let module: TestingModule;
  let givenUser: User;
  let givenPrompt: Prompt;

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

    const readEm = orm.em.fork();
    givenUser = (await readEm.findAll(User, { limit: 1 }))[0];
    givenPrompt = await readEm.findOneOrFail(Prompt, { id: BigInt(1) });
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

  describe("findDrawingById 메소드는", () => {
    describe("존재하는 drawingId면", () => {
      it("user 정보가 포함된 그림을 반환한다", async () => {
        const existing = await orm.em
          .fork()
          .findOneOrFail(
            Drawing,
            { user: givenUser.userKey },
            { orderBy: { id: "ASC" } },
          );

        const found = await repository.findDrawingById(existing.id);

        expect(found).not.toBeNull();
        expect(found!.id).toBe(existing.id);
        expect(found!.user).toBeDefined();
        expect(found!.user.nickname).toBeTruthy();
      });
    });
    describe("존재하지 않는 drawingId면", () => {
      it("null을 반환한다", async () => {
        const found = await repository.findDrawingById(BigInt(999999999));
        expect(found).toBeNull();
      });
    });
  });

  describe("findMyDrawings 메소드는", () => {
    describe("제출한 기록이 있으면", () => {
      it("id/similarity/strokes만 반환한다", async () => {
        const result = await repository.findMyDrawings(givenUser.userKey);

        expect(result.length).toBeGreaterThan(0);
        expect(result[0]).toHaveProperty("id");
        expect(result[0]).toHaveProperty("similarity");
        expect(result[0]).toHaveProperty("strokes");
        expect(Object.keys(result[0]).sort()).toEqual([
          "id",
          "similarity",
          "strokes",
        ]);
        expect(() => {
          JSON.parse(result[0].strokes);
        }).not.toThrow();
        expect(() => {
          JSON.parse(result[0].similarity);
        }).not.toThrow();
      });

      it("오늘 제출한 기록만 반환한다", async () => {
        const writeEm = orm.em.fork();
        const user = await writeEm.findOneOrFail(User, {
          userKey: givenUser.userKey,
        });
        const prompt = await writeEm.findOneOrFail(Prompt, {
          id: givenPrompt.id,
        });

        const oldDrawing = writeEm.create(Drawing, {
          user,
          prompt,
          strokes: JSON.stringify([{ points: [[9], [9]], color: [9, 9, 9] }]),
          similarity: JSON.stringify({
            score: 1,
            strokeMatchSimilarity: 1,
            shapeSimilarity: 1,
            penalty: 1,
          }),
          score: 1,
          createdAt: new Date("2000-01-01T00:00:00.000Z"),
          updatedAt: new Date("2000-01-01T00:00:00.000Z"),
        });
        writeEm.persist(oldDrawing);
        await writeEm.flush();

        const result = await repository.findMyDrawings(givenUser.userKey);
        const ids = result.map((drawing) => drawing.id);

        expect(ids).not.toContain(oldDrawing.id);
      });
    });

    describe("제출한 기록이 없으면", () => {
      it("빈 배열을 반환한다", async () => {
        const result = await repository.findMyDrawings(0);
        expect(result).toEqual([]);
      });
    });
  });
});
