import type { UserMission } from "../entity/user-mission.entity";
import type {
  ActionContext,
  DrawingContext,
  MissionCommand,
} from "../mission.types";

export class ScoreCommand implements MissionCommand {
  matches(userMission: UserMission, context: ActionContext): boolean {
    const { score } = context as DrawingContext;
    if (score == null) return false;

    const { threshold } = userMission.mission;
    if (threshold != null && score < threshold) return false;

    return true;
  }
}
