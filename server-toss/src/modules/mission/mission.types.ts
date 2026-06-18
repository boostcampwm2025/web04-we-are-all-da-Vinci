import { ObjectiveType } from "./entity/mission.entity";
import type { UserMission } from "./entity/user-mission.entity";

export type BaseActionContext = { objectiveType: ObjectiveType };

export type DrawingContext = {
  drawingId: bigint;
  score: number;
  penalty: number;
};

export type MissionCompletedAction = {
  completedMissionIds: bigint[];
};

export type ActionContext =
  | DrawingContext
  | (MissionCompletedAction & BaseActionContext)
  | BaseActionContext;

/**
 * 이벤트가 미션 목표를 충족하는지 판단하는 순수 predicate.
 * 카운트 증가/케이던스 게이트는 processor가 담당한다 (커맨드는 mutation 없음).
 */
export interface MissionCommand {
  matches(userMission: UserMission, context: ActionContext): boolean;
}

export interface CycleResult {
  completed: UserMission[];
  metaCompleted: UserMission[];
}
