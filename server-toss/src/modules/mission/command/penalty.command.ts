import type { UserMission } from "../entity/user-mission.entity";
import type {
  ActionContext,
  DrawingContext,
  MissionCommand,
} from "../mission.types";

export class PenaltyCommand implements MissionCommand {
  matches(userMission: UserMission, context: ActionContext): boolean {
    const { penalty } = context as DrawingContext;
    if (penalty == null) return false;

    const { threshold } = userMission.mission;
    if (threshold != null && penalty > threshold) return false;

    return true;
  }
}
