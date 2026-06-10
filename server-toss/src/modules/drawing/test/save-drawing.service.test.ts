import { MikroORM } from "@mikro-orm/mysql";
import { MikroOrmModule } from "@mikro-orm/nestjs";
import { Test, TestingModule } from "@nestjs/testing";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { Stroke } from "@toss/shared";
import config from "src/mikro-orm.config";
import { Prompt } from "src/modules/prompt/prompt.entity";
import { User } from "src/modules/user/user.entity";
import { SmallUserDrawingSeeder } from "src/seeders/small-user-drawing.seeder";
import { SaveDrawingDto } from "../dto/save-drawing.dto";
import { Drawing } from "../drawing.entity";
import { DrawingRepository } from "../drawing.repository";
import { Ranking } from "../../ranking/ranking.entity";
import { RankingRepository } from "../../ranking/ranking.repository";
import { RankingService } from "../../ranking/ranking.service";
import { SaveDrawingService } from "../service/save-drawing.service";
import { PointService } from "src/modules/point/point.service";
import { QuestService } from "src/modules/quest/quest.service";

describe("SaveDrawingService", () => {
  let orm: MikroORM;
  let module: TestingModule;
  let service: SaveDrawingService;
  let rankingService: RankingService;
  let drawingRepository: DrawingRepository;
  let rankingRepository: RankingRepository;
  let pointService: { savePointGrantRequest: jest.Mock };
  let questService: { onDrawingSubmitted: jest.Mock };

  let givenUsers: User[];
  let givenPrompt: Prompt;

  const sampleStrokes: Stroke[] = [
    {
      points: [
        [0, 1],
        [0, 1],
      ],
      color: [0, 0, 0],
    },
  ];

  const sampleSimilarity = {
    score: 87,
    strokeMatchSimilarity: 85,
    shapeSimilarity: 88,
    penalty: 5,
  };

  beforeAll(async () => {
    pointService = {
      savePointGrantRequest: jest.fn(() => true),
    };

    questService = {
      onDrawingSubmitted: jest.fn(async () => Promise.resolve([])),
    };

    module = await Test.createTestingModule({
      imports: [
        MikroOrmModule.forRoot(config),
        MikroOrmModule.forFeature({
          entities: [Drawing, Ranking],
        }),
      ],
      providers: [
        SaveDrawingService,
        RankingService,
        { provide: PointService, useValue: pointService },
        { provide: QuestService, useValue: questService },
      ],
    }).compile();

    service = module.get<SaveDrawingService>(SaveDrawingService);
    rankingService = module.get<RankingService>(RankingService);
    drawingRepository = module.get<DrawingRepository>(DrawingRepository);
    rankingRepository = module.get<RankingRepository>(RankingRepository);
    orm = module.get<MikroORM>(MikroORM);
    (service as unknown as { em: unknown }).em = orm.em;
    (rankingService as unknown as { em: unknown }).em = orm.em;

    await orm.schema.refresh();
    await orm.seeder.seed(SmallUserDrawingSeeder);

    const readEm = orm.em.fork();
    givenUsers = await readEm.findAll(User, { limit: 10 });
    givenPrompt = await readEm.findOneOrFail(Prompt, { id: BigInt(1) });
  });

  afterEach(() => {
    jest.restoreAllMocks();
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

  describe("saveDrawingWithRanking", () => {
    describe("그림 저장에 실패하면", () => {
      it("랭킹 갱신을 호출하지 않는다", async () => {
        const user = givenUsers[0];
        jest
          .spyOn(drawingRepository, "saveDrawing")
          .mockRejectedValue(new Error("DRAWING_SAVE_FAILED"));
        const updateRankingSpy = jest.spyOn(rankingService, "updateRanking");

        await expect(
          service.saveDrawingWithRanking(
            user,
            new SaveDrawingDto(
              Number(givenPrompt.id),
              sampleStrokes,
              sampleSimilarity,
            ),
          ),
        ).rejects.toThrow("DRAWING_SAVE_FAILED");

        expect(updateRankingSpy).not.toHaveBeenCalled();
      });
    });

    describe("랭킹 저장에 실패하면", () => {
      it("그림 제출이 롤백된다", async () => {
        const user = givenUsers[1];
        jest
          .spyOn(rankingRepository, "saveOne")
          .mockRejectedValue(new Error("RANKING_SAVE_FAILED"));

        const beforeCount = await orm.em
          .fork()
          .count(Drawing, { user: user.userKey });
        const beforeRankingCount = await orm.em
          .fork()
          .count(Ranking, { userKey: user.userKey });

        await expect(
          service.saveDrawingWithRanking(
            user,
            new SaveDrawingDto(
              Number(givenPrompt.id),
              sampleStrokes,
              sampleSimilarity,
            ),
          ),
        ).rejects.toThrow("RANKING_SAVE_FAILED");

        const afterCount = await orm.em
          .fork()
          .count(Drawing, { user: user.userKey });
        const afterRankingCount = await orm.em
          .fork()
          .count(Ranking, { userKey: user.userKey });

        expect(afterCount).toBe(beforeCount);
        expect(afterRankingCount).toBe(beforeRankingCount);
      });
    });

    describe("정상 처리되면", () => {
      it("drawing과 ranking이 함께 커밋된다", async () => {
        const user = givenUsers[2];

        const beforeDrawingCount = await orm.em
          .fork()
          .count(Drawing, { user: user.userKey });
        const beforeRankingCount = await orm.em
          .fork()
          .count(Ranking, { userKey: user.userKey });

        const saved = await service.saveDrawingWithRanking(
          user,
          new SaveDrawingDto(
            Number(givenPrompt.id),
            sampleStrokes,
            sampleSimilarity,
          ),
        );

        const afterDrawingCount = await orm.em
          .fork()
          .count(Drawing, { user: user.userKey });
        const afterRankingCount = await orm.em
          .fork()
          .count(Ranking, { userKey: user.userKey });
        const savedRanking = await orm.em
          .fork()
          .findOneOrFail(Ranking, { userKey: user.userKey });

        expect(afterDrawingCount).toBe(beforeDrawingCount + 1);
        expect(afterRankingCount).toBe(beforeRankingCount + 1);
        expect(savedRanking.drawingId).toBe(saved.id);
        expect(savedRanking.score).toBe(sampleSimilarity.score);
      });
    });

    describe("기존 ranking 업데이트 중 실패하면", () => {
      it("drawing 제출도 롤백된다", async () => {
        const user = givenUsers[3];
        const existingDrawing = await orm.em
          .fork()
          .findOneOrFail(
            Drawing,
            { user: user.userKey },
            { orderBy: { id: "ASC" } },
          );
        await rankingRepository.saveOne(user, existingDrawing);

        const beforeDrawingCount = await orm.em
          .fork()
          .count(Drawing, { user: user.userKey });
        const beforeRanking = await orm.em
          .fork()
          .findOneOrFail(Ranking, { userKey: user.userKey });

        jest.spyOn(Ranking.prototype, "update").mockImplementation(() => {
          throw new Error("RANKING_UPDATE_FAILED");
        });

        await expect(
          service.saveDrawingWithRanking(
            user,
            new SaveDrawingDto(Number(givenPrompt.id), sampleStrokes, {
              ...sampleSimilarity,
              score: 999,
            }),
          ),
        ).rejects.toThrow("RANKING_UPDATE_FAILED");

        const afterDrawingCount = await orm.em
          .fork()
          .count(Drawing, { user: user.userKey });
        const afterRanking = await orm.em
          .fork()
          .findOneOrFail(Ranking, { id: beforeRanking.id });

        expect(afterDrawingCount).toBe(beforeDrawingCount);
        expect(afterRanking.drawingId).toBe(beforeRanking.drawingId);
        expect(afterRanking.score).toBe(beforeRanking.score);
      });
    });
  });
});
