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

  // 친구 초대 이벤트 — 공유 적립(ChanceService.chargeByShare) 성공 시마다 호출된다.
  // 당일 누적 초대 횟수(inviteCount = ShareLog 개수)를 단일 소스로 삼아 INVITE 미션을
  // 멱등 갱신한다. 진행을 ++로 누적하지 않으므로, 어떤 호출이 누락돼도 다음 초대가
  // currentCount를 실제 ShareLog 개수로 보정한다(드리프트·복구불가 방지).
  @Transactional()
  async onFriendInvited(userKey: number, inviteCount: number): Promise<void> {
    const window = MissionWindow.now();
    await this.assignMissionService.ensureMissionsAssigned(userKey, window);
    // 같은 유저 동시 요청 직렬화 — 활성 미션 조회 전에 행을 잠근다
    await this.userMissionRepo.lockActiveForUpdate(userKey);

    // findActiveByObjective는 completedAt: null만 반환 → 미배정·완료 시 []이고 멱등하게 종료.
    const [invite] = await this.userMissionRepo.findActiveByObjective(
      userKey,
      ObjectiveType.INVITE,
      window.todayStart,
      window.weekStart,
    );
    if (!invite) return;

    const required = invite.mission.requiredCount;
    // ShareLog 개수로 멱등 설정. 후퇴 방지를 위해 기존 값과 max, 상한은 required.
    const next = Math.min(Math.max(invite.currentCount, inviteCount), required);
    if (next === invite.currentCount) return; // 변화 없음(중복/지연 호출)
    invite.currentCount = next;

    if (invite.currentCount >= required) {
      invite.completedAt = window.now;
      if (invite.mission.rewardAmount > 0) {
        await this.pointService.savePointGrantRequest(
          userKey,
          PointReason.MISSION,
          invite.mission.rewardAmount,
        );
      }
      // 일일 미션 완료 수를 세는 주간 메타("일일 미션 N개 완료")를 1 증가시킨다.
      await this.progressDailyCompletionMeta(userKey, window);
    }

    await this.userMissionRepo.flush();
  }

  private async progressDailyCompletionMeta(
    userKey: number,
    window: MissionWindow,
  ): Promise<void> {
    const metas = await this.userMissionRepo.findActiveByObjective(
      userKey,
      ObjectiveType.MISSION_COMPLETED,
      window.todayStart,
      window.weekStart,
    );
    for (const meta of metas) {
      meta.currentCount += 1;
      if (
        meta.currentCount >= meta.mission.requiredCount &&
        !meta.completedAt
      ) {
        meta.completedAt = window.now;
        if (meta.mission.rewardAmount > 0) {
          await this.pointService.savePointGrantRequest(
            userKey,
            PointReason.MISSION,
            meta.mission.rewardAmount,
          );
        }
      }
    }
  }
}
