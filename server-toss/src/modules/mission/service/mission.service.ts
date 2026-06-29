import { Transactional } from "@mikro-orm/decorators/legacy";
import { EntityManager } from "@mikro-orm/mysql";
import { Injectable, Logger } from "@nestjs/common";
import { PointReason } from "../../point/entity/point-log.entity";
import { PointService } from "../../point/point.service";
import { MyMissionsResponseDto } from "../dto/my-missions-response.dto";
import { TodayMissionsResponseDto } from "../dto/today-missions-response.dto";
import { ObjectiveType } from "../entity/mission.entity";
import { UserMission } from "../entity/user-mission.entity";
import { MissionWindow } from "../mission-window";
import { MissionMapper } from "../mission.mapper";
import type {
  BaseActionContext,
  CycleResult,
  DrawingContext,
} from "../mission.types";
import type { UserMissionRepository } from "../repository/user-mission.repository";
import { AssignMissionService } from "./assign-mission.service";
import { ChallengeMissionService } from "./challenge-mission.service";
import { MissionProcessor } from "./mission.processor";
import { TutorialMissionService } from "./tutorial-mission.service";

function mergeCycleResults(...results: CycleResult[]): CycleResult {
  return {
    completed: results.flatMap((r) => r.completed),
    metaCompleted: results.flatMap((r) => r.metaCompleted),
  };
}

@Injectable()
export class MissionService {
  private readonly logger = new Logger(MissionService.name);

  constructor(
    private readonly userMissionRepo: UserMissionRepository,
    private readonly em: EntityManager,
    private readonly processor: MissionProcessor,
    private readonly assignMissionService: AssignMissionService,
    private readonly tutorialMissionService: TutorialMissionService,
    private readonly challengeMissionService: ChallengeMissionService,
    private readonly pointService: PointService,
  ) {}

  async myMissions(userKey: number): Promise<MyMissionsResponseDto> {
    return this.queryMyMissions(userKey, MissionWindow.now());
  }

  async assignAndGetMyMissions(
    userKey: number,
  ): Promise<MyMissionsResponseDto> {
    const window = MissionWindow.now();
    await this.assignMissionService.ensureMissionsAssigned(userKey, window);
    await this.challengeMissionService.ensureAssigned(userKey);
    return this.queryMyMissions(userKey, window);
  }

  /** 대시보드 카드용 — 오늘의 일일 미션만 경량 조회 (순수 read, 배정은 클라 훅이 처리) */
  async todayDailyMissions(userKey: number): Promise<TodayMissionsResponseDto> {
    const window = MissionWindow.now();
    const missions = await this.userMissionRepo.findTodayDailyMissions(
      userKey,
      window.todayStart,
    );
    return MissionMapper.toTodayResponse(missions);
  }

  private async queryMyMissions(
    userKey: number,
    window: MissionWindow,
  ): Promise<MyMissionsResponseDto> {
    const missions = await this.userMissionRepo.findCurrentMissions(
      userKey,
      window.todayStart,
      window.weekStart,
    );
    const tutorialMissions =
      await this.userMissionRepo.findTutorialMissions(userKey);
    const challengeMissions =
      await this.challengeMissionService.findAll(userKey);

    return MissionMapper.toResponse(
      missions,
      tutorialMissions,
      challengeMissions,
    );
  }

  // ─── 그림 제출 이벤트 ───

  @Transactional()
  async onDrawingSubmitted(
    userKey: number,
    context: DrawingContext,
  ): Promise<CycleResult> {
    const window = MissionWindow.now();
    await this.assignMissionService.ensureMissionsAssigned(userKey, window);
    await this.challengeMissionService.ensureAssigned(userKey);
    await this.userMissionRepo.lockActiveForUpdate(userKey);

    const regular = await this.processRegularMissions(userKey, context, window);
    const tutorial = await this.tutorialMissionService.processDrawing(
      userKey,
      context,
      window,
    );
    const challenge = await this.challengeMissionService.processDrawing(
      userKey,
      context,
      window,
    );

    const result = mergeCycleResults(regular, tutorial, challenge);
    this.grantRewards(userKey, [...result.completed, ...result.metaCompleted]);
    await this.em.flush();

    return result;
  }

  // ─── 미션 액션 (방문, 공유 등) ───

  @Transactional()
  async onActionReported(
    userKey: number,
    context: BaseActionContext,
  ): Promise<CycleResult> {
    const window = MissionWindow.now();
    await this.assignMissionService.ensureMissionsAssigned(userKey, window);
    await this.userMissionRepo.lockActiveForUpdate(userKey);

    const result = await this.tutorialMissionService.processAction(
      userKey,
      context,
      window,
    );
    this.grantRewards(userKey, [...result.completed, ...result.metaCompleted]);
    await this.em.flush();

    return result;
  }

  private async processRegularMissions(
    userKey: number,
    context: DrawingContext,
    window: MissionWindow,
  ): Promise<CycleResult> {
    const active = await this.userMissionRepo.findActiveDrawingMissions(
      userKey,
      window.todayStart,
      window.weekStart,
    );
    const meta = await this.userMissionRepo.findActiveByObjective(
      userKey,
      ObjectiveType.MISSION_COMPLETED,
      window.todayStart,
      window.weekStart,
    );
    return this.processor.executeProgressCycle(active, meta, context, window);
  }

  async syncInviteProgress(
    userKey: number,
    inviteCount: number,
  ): Promise<void> {
    const window = MissionWindow.now();

    const invite = await this.em.findOne(
      UserMission,
      {
        user: { userKey },
        completedAt: null,
        createdAt: window.todayStart,
        mission: { objectiveType: ObjectiveType.INVITE },
      },
      { populate: ["mission"] },
    );
    if (!invite) return;

    const required = invite.mission.requiredCount;
    const next = Math.min(inviteCount, required);
    if (next === invite.currentCount) return;
    invite.currentCount = next;

    if (invite.currentCount >= required) {
      invite.completedAt = window.now;
      this.grantRewards(userKey, [invite]);
      await this.progressDailyCompletionMeta(userKey, window);
    }
  }

  private async progressDailyCompletionMeta(
    userKey: number,
    window: MissionWindow,
  ): Promise<void> {
    const metas = await this.em.find(
      UserMission,
      {
        user: { userKey },
        completedAt: null,
        createdAt: window.weekStart,
        mission: { objectiveType: ObjectiveType.MISSION_COMPLETED },
      },
      { populate: ["mission"] },
    );
    for (const meta of metas) {
      meta.currentCount += 1;
      if (
        meta.currentCount >= meta.mission.requiredCount &&
        !meta.completedAt
      ) {
        meta.completedAt = window.now;
        this.grantRewards(userKey, [meta]);
      }
    }
  }

  private grantRewards(userKey: number, completed: UserMission[]): void {
    for (const uq of completed) {
      if (uq.mission.rewardAmount === 0) continue;

      this.pointService.enqueueGrant(
        userKey,
        PointReason.MISSION,
        uq.mission.rewardAmount,
      );

      this.logger.log(
        {
          event: "mission.complete.succeeded",
          userKey,
          missionId: uq.mission.id.toString(),
          rewardType: uq.mission.rewardType,
          rewardAmount: uq.mission.rewardAmount,
        },
        "미션 완료",
      );
    }
  }
}
