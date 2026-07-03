import { EntityManager } from "@mikro-orm/core";
import { Transactional } from "@mikro-orm/decorators/legacy";
import { InjectRepository } from "@mikro-orm/nestjs";
import { Injectable } from "@nestjs/common";
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
import { PointReason } from "../../point/entity/point-log.entity";
import { PointService } from "../../point/point.service";
import { AssignMissionService } from "./assign-mission.service";
import { MissionProcessor } from "./mission.processor";
import { TutorialMissionService } from "./tutorial-mission.service";

@Injectable()
export class MissionService {
  constructor(
    @InjectRepository(UserMission)
    private readonly userMissionRepo: UserMissionRepository,
    private readonly processor: MissionProcessor,
    private readonly assignMissionService: AssignMissionService,
    private readonly tutorialMissionService: TutorialMissionService,
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

    return MissionMapper.toResponse(missions, tutorialMissions);
  }

  // ─── 그림 제출 이벤트 (daily/weekly + tutorial SUBMIT/SCORE/RETRY) ───

  @Transactional()
  async onDrawingSubmitted(
    userKey: number,
    context: DrawingContext,
  ): Promise<CycleResult> {
    const window = MissionWindow.now();
    await this.assignMissionService.ensureMissionsAssigned(userKey, window);
    // 같은 유저 동시 요청 직렬화 — 활성 미션 조회 전에 행을 잠근다
    await this.userMissionRepo.lockActiveForUpdate(userKey);

    const drawingActive = await this.userMissionRepo.findActiveDrawingMissions(
      userKey,
      window.todayStart,
      window.weekStart,
    );
    // 튜토리얼은 완료 게이트 뒤 — 완료 유저는 쿼리 없이 []
    const tutorialDrawing =
      await this.tutorialMissionService.findActiveDrawing(userKey);

    const weeklyMeta = await this.userMissionRepo.findActiveByObjective(
      userKey,
      ObjectiveType.MISSION_COMPLETED,
      window.todayStart,
      window.weekStart,
    );
    const tutorialMeta =
      await this.tutorialMissionService.findActiveMeta(userKey);

    const result = await this.processor.executeProgressCycle(
      userKey,
      [...drawingActive, ...tutorialDrawing],
      [...weeklyMeta, ...tutorialMeta],
      context,
      window,
    );

    await this.tutorialMissionService.recordCompletionIfFinished(
      userKey,
      result,
      window,
    );
    await this.userMissionRepo.flush();

    return result;
  }

  // 미션 액션 (방문, 공유 등)

  @Transactional()
  async onActionReported(
    userKey: number,
    context: BaseActionContext,
  ): Promise<CycleResult> {
    const window = MissionWindow.now();
    await this.assignMissionService.ensureMissionsAssigned(userKey, window);
    // 같은 유저 동시 요청 직렬화 — 활성 미션 조회 전에 행을 잠근다
    await this.userMissionRepo.lockActiveForUpdate(userKey);

    const tutorialActive =
      await this.tutorialMissionService.findActiveByObjective(
        userKey,
        context.objectiveType,
      );

    const tutorialMeta =
      await this.tutorialMissionService.findActiveMeta(userKey);

    const result = await this.processor.executeProgressCycle(
      userKey,
      tutorialActive,
      tutorialMeta,
      context,
      window,
    );

    await this.tutorialMissionService.recordCompletionIfFinished(
      userKey,
      result,
      window,
    );
    await this.userMissionRepo.flush();

    return result;
  }

  // 친구 초대 미션 동기화 — 공유 적립(ChanceService.chargeByShare)과 **같은 트랜잭션**에서,
  // 호출자가 넘긴 em으로 동작한다. inviteCount(= 당일 ShareLog 실제 개수)를 단일 소스로
  // INVITE 미션 currentCount를 멱등 **설정**(증가 아님)하므로, ShareLog 기록과 원자적으로
  // 커밋/롤백되어 드리프트가 발생하지 않는다.
  // 주의: 주입된 repo(this.userMissionRepo)는 이 트랜잭션 fork가 아니므로 쓰지 말고,
  // 반드시 전달받은 em으로만 조회/변경한다. flush는 호출자 트랜잭션 커밋 시 함께 수행.
  async syncInviteProgress(
    em: EntityManager,
    userKey: number,
    inviteCount: number,
  ): Promise<void> {
    const window = MissionWindow.now();

    // 활성(미완료) 오늘자 INVITE 미션. 미배정/완료 시 null → 멱등하게 종료.
    const invite = await em.findOne(
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
    // ShareLog 실개수(상한 required)로 그대로 설정. chargeByShare가 유일한 작성자이고
    // 같은 트랜잭션에서 호출되므로 inviteCount는 단조 증가하는 실값 → 별도 보정(max) 불필요.
    const next = Math.min(inviteCount, required);
    if (next === invite.currentCount) return;
    invite.currentCount = next;

    if (invite.currentCount >= required) {
      invite.completedAt = window.now;
      if (invite.mission.rewardAmount > 0) {
        // 같은 트랜잭션에 보상 적재(커밋 시 함께 반영) — 상태만 바뀌고 보상 누락 방지.
        this.pointService.enqueueGrant(
          em,
          userKey,
          PointReason.MISSION,
          invite.mission.rewardAmount,
        );
      }
      await this.progressDailyCompletionMetaWithEm(em, userKey, window);
    }
  }

  // 주간 메타("일일 미션 N개 완료")를 전달받은 em으로 1 증가시킨다.
  private async progressDailyCompletionMetaWithEm(
    em: EntityManager,
    userKey: number,
    window: MissionWindow,
  ): Promise<void> {
    const metas = await em.find(
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
        if (meta.mission.rewardAmount > 0) {
          this.pointService.enqueueGrant(
            em,
            userKey,
            PointReason.MISSION,
            meta.mission.rewardAmount,
          );
        }
      }
    }
  }
}
