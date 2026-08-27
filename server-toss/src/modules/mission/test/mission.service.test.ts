import { MikroORM } from "@mikro-orm/mysql";
import { jest } from "@jest/globals";
import config from "src/mikro-orm.config";
import { User } from "src/modules/user/user.entity";
import {
  Mission,
  MissionPeriod,
  ObjectiveType,
  ProgressPeriod,
  RewardType,
} from "../entity/mission.entity";
import { UserMission } from "../entity/user-mission.entity";
import { MissionWindow } from "../mission-window";
import { MissionProcessor } from "../service/mission.processor";
import { MissionService } from "../service/mission.service";

describe("미션 서비스 통합 동작", () => {
  let orm: MikroORM;
  let service: MissionService;

  const userKey = 987654321;
  const actionObjectives = [
    ObjectiveType.SHARE,
    ObjectiveType.VISIT_RANKING,
    ObjectiveType.VISIT_MISSION_TAB,
    ObjectiveType.VISIT_DRAWING_DETAIL,
  ];

  beforeAll(async () => {
    orm = await MikroORM.init(config);
    await orm.schema.refresh();

    const userMissionRepository = orm.em.getRepository(UserMission);
    const emptyCycle = { completed: [], metaCompleted: [] };

    service = new MissionService(
      orm.em,
      userMissionRepository,
      new MissionProcessor(),
      { ensureMissionsAssigned: jest.fn() } as never,
      { processDrawing: jest.fn(() => Promise.resolve(emptyCycle)) } as never,
      {
        ensureAssigned: jest.fn(),
        processDrawing: jest.fn(() => Promise.resolve(emptyCycle)),
      } as never,
      { enqueueGrant: jest.fn() } as never,
    );

    const window = MissionWindow.now();
    const user = orm.em.create(User, {
      userKey,
      name: "테스트",
      nickname: "액션미션테스트",
    });
    orm.em.persist(user);

    actionObjectives.forEach((objectiveType, index) => {
      const mission = orm.em.create(Mission, {
        title: `액션 미션 ${index + 1}`,
        period: MissionPeriod.DAILY,
        isFixed: true,
        objectiveType,
        requiredCount: 1,
        threshold: null,
        rewardType: RewardType.POINT,
        rewardAmount: 1,
        category: null,
        progressPeriod: ProgressPeriod.NONE,
      });
      orm.em.persist(mission);
      orm.em.persist(
        orm.em.create(UserMission, {
          user,
          mission,
          currentCount: 0,
          completedAt: null,
          lastProgressedAt: null,
          createdAt: window.todayStart,
        }),
      );
    });

    await orm.em.flush();
  });

  afterAll(async () => {
    if (orm) {
      await orm.schema.refresh();
      await orm.close();
    }
  });

  it("공유와 화면 방문 미션을 진행하지 않는다", async () => {
    const result = await service.onDrawingSubmitted(userKey, {
      drawingId: 1n,
      score: 100,
      penalty: 0,
    });

    orm.em.clear();
    const missions = await orm.em.find(
      UserMission,
      { user: { userKey } },
      { populate: ["mission"], orderBy: { id: "asc" } },
    );

    expect(missions.map((mission) => mission.mission.objectiveType)).toEqual(
      actionObjectives,
    );
    expect(missions.map((mission) => mission.currentCount)).toEqual([
      0, 0, 0, 0,
    ]);
    expect(missions.every((mission) => mission.completedAt == null)).toBe(true);
    expect(result).toEqual({ completed: [], metaCompleted: [] });
  });
});
